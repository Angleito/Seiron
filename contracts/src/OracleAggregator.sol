// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IOracle.sol";
import "./interfaces/IDataLogger.sol";
import "./interfaces/IDataTypes.sol";

/**
 * @title OracleAggregator
 * @dev Aggregates price data from multiple oracles and logs to DataLogger
 * @notice Optimized for Sei's fast block times with minimal storage and maximum events
 */
contract OracleAggregator is IOracle {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @dev Contract owner
    address public immutable owner;

    /// @dev DataLogger contract reference
    IDataLogger public immutable dataLogger;

    /// @dev Minimum confidence threshold (basis points)
    uint256 public constant MIN_CONFIDENCE_THRESHOLD = 5000; // 50%

    /// @dev Maximum price deviation threshold (basis points)
    uint256 public constant PRICE_DEVIATION_THRESHOLD = 1000; // 10%

    /// @dev Minimum number of oracles required for aggregation
    uint256 public constant MIN_ORACLE_COUNT = 2;

    /// @dev Maximum age of price data (seconds)
    uint256 public constant MAX_PRICE_AGE = 300; // 5 minutes

    /// @dev Authorized oracles per asset
    mapping(address => mapping(address => bool)) public authorizedOracles;

    /// @dev Latest price data per asset (minimal storage)
    mapping(address => IDataTypes.OracleData) private _latestPrices;

    /// @dev Round counter per asset
    mapping(address => uint256) public latestRounds;

    /// @dev Oracle count per asset
    mapping(address => uint256) public assetOracleCount;

    /// @dev Emergency pause state
    bool public paused;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Emitted when oracle authorization changes
    event OracleAuthorizationChanged(
        address indexed oracle,
        address indexed asset,
        bool authorized,
        uint256 timestamp
    );

    /// @dev Emitted when aggregation fails
    event AggregationFailed(
        address indexed asset,
        string reason,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error Unauthorized();
    error ContractPaused();
    error InvalidInput();
    error InsufficientOracles();
    error PriceDeviationTooHigh();
    error StalePrice();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier onlyAuthorizedOracle(address asset) {
        if (!authorizedOracles[msg.sender][asset]) revert Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor
     * @param _owner Contract owner address
     * @param _dataLogger DataLogger contract address
     */
    constructor(address _owner, address _dataLogger) {
        if (_owner == address(0) || _dataLogger == address(0)) revert InvalidInput();
        
        owner = _owner;
        dataLogger = IDataLogger(_dataLogger);
    }

    /*//////////////////////////////////////////////////////////////
                            ORACLE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOracle
    function getLatestPrice(address asset)
        external
        view
        override
        returns (uint256 price, uint256 confidence, uint256 timestamp)
    {
        IDataTypes.OracleData memory data = _latestPrices[asset];
        if (block.timestamp - data.timestamp > MAX_PRICE_AGE) revert StalePrice();
        
        return (data.price, data.confidence, data.timestamp);
    }

    /// @inheritdoc IOracle
    function getHistoricalPrice(address asset, uint256 roundId)
        external
        view
        override
        returns (uint256 price, uint256 confidence, uint256 timestamp)
    {
        // For gas optimization, we only store latest price
        // Historical data should be retrieved from events
        if (roundId != latestRounds[asset]) revert InvalidInput();
        
        IDataTypes.OracleData memory data = _latestPrices[asset];
        return (data.price, data.confidence, data.timestamp);
    }

    /// @inheritdoc IOracle
    function updatePrice(
        address asset,
        uint256 price,
        uint256 confidence
    ) external override onlyAuthorizedOracle(asset) whenNotPaused {
        if (asset == address(0) || price == 0 || confidence > 10000) revert InvalidInput();

        uint256 currentTimestamp = block.timestamp;
        uint256 newRound = latestRounds[asset] + 1;

        // Calculate price deviation if previous price exists
        uint256 deviation = 0;
        if (_latestPrices[asset].price > 0) {
            uint256 priceDiff = price > _latestPrices[asset].price 
                ? price - _latestPrices[asset].price 
                : _latestPrices[asset].price - price;
            deviation = (priceDiff * 10000) / _latestPrices[asset].price;
        }

        // Update storage (minimal)
        _latestPrices[asset] = IDataTypes.OracleData({
            oracle: msg.sender,
            asset: asset,
            price: price,
            confidence: confidence,
            timestamp: currentTimestamp,
            roundId: newRound,
            deviation: deviation
        });

        latestRounds[asset] = newRound;

        // Emit events for data collection
        emit PriceUpdated(asset, price, confidence, currentTimestamp, newRound);

        // Log to DataLogger for AI training data
        dataLogger.logOracleUpdate(msg.sender, asset, price, confidence);
    }

    /// @inheritdoc IOracle
    function batchUpdatePrices(
        address[] memory assets,
        uint256[] memory prices,
        uint256[] memory confidences
    ) external override whenNotPaused {
        uint256 length = assets.length;
        if (length != prices.length || length != confidences.length || length == 0) {
            revert InvalidInput();
        }

        uint256 currentTimestamp = block.timestamp;
        
        for (uint256 i = 0; i < length;) {
            address asset = assets[i];
            uint256 price = prices[i];
            uint256 confidence = confidences[i];

            if (authorizedOracles[msg.sender][asset] && 
                asset != address(0) && 
                price > 0 && 
                confidence <= 10000) {
                
                uint256 newRound = latestRounds[asset] + 1;
                
                // Calculate deviation
                uint256 deviation = 0;
                if (_latestPrices[asset].price > 0) {
                    uint256 priceDiff = price > _latestPrices[asset].price 
                        ? price - _latestPrices[asset].price 
                        : _latestPrices[asset].price - price;
                    deviation = (priceDiff * 10000) / _latestPrices[asset].price;
                }

                // Update storage
                _latestPrices[asset] = IDataTypes.OracleData({
                    oracle: msg.sender,
                    asset: asset,
                    price: price,
                    confidence: confidence,
                    timestamp: currentTimestamp,
                    roundId: newRound,
                    deviation: deviation
                });

                latestRounds[asset] = newRound;

                // Emit events
                emit PriceUpdated(asset, price, confidence, currentTimestamp, newRound);
                
                // Log to DataLogger
                dataLogger.logOracleUpdate(msg.sender, asset, price, confidence);
            }
            
            unchecked {
                ++i;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOracle
    function getActiveOracleCount(address asset) external view override returns (uint256) {
        return assetOracleCount[asset];
    }

    /// @inheritdoc IOracle
    function getMinConfidenceThreshold() external pure override returns (uint256) {
        return MIN_CONFIDENCE_THRESHOLD;
    }

    /// @inheritdoc IOracle
    function getLatestRound(address asset) external view override returns (uint256) {
        return latestRounds[asset];
    }

    /// @inheritdoc IOracle
    function isAuthorizedOracle(address oracle, address asset) external view override returns (bool) {
        return authorizedOracles[oracle][asset];
    }

    /// @inheritdoc IOracle
    function getPriceDeviationThreshold() external pure override returns (uint256) {
        return PRICE_DEVIATION_THRESHOLD;
    }

    /**
     * @dev Get price data with deviation info
     * @param asset The asset address
     * @return data Complete oracle data structure
     */
    function getPriceData(address asset) external view returns (IDataTypes.OracleData memory data) {
        return _latestPrices[asset];
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Authorize or deauthorize an oracle for an asset
     * @param oracle The oracle address
     * @param asset The asset address
     * @param authorized Authorization status
     */
    function setOracleAuthorization(
        address oracle,
        address asset,
        bool authorized
    ) external onlyOwner {
        if (oracle == address(0) || asset == address(0)) revert InvalidInput();

        bool wasAuthorized = authorizedOracles[oracle][asset];
        authorizedOracles[oracle][asset] = authorized;

        // Update oracle count
        if (authorized && !wasAuthorized) {
            assetOracleCount[asset]++;
        } else if (!authorized && wasAuthorized) {
            assetOracleCount[asset]--;
        }

        emit OracleAuthorizationChanged(oracle, asset, authorized, block.timestamp);
        emit OracleStatusChanged(oracle, authorized, block.timestamp);
    }

    /**
     * @dev Batch authorize oracles
     * @param oracles Array of oracle addresses
     * @param assets Array of asset addresses
     * @param authorizations Array of authorization statuses
     */
    function batchSetOracleAuthorization(
        address[] memory oracles,
        address[] memory assets,
        bool[] memory authorizations
    ) external onlyOwner {
        uint256 length = oracles.length;
        if (length != assets.length || length != authorizations.length) revert InvalidInput();

        uint256 timestamp = block.timestamp;
        
        for (uint256 i = 0; i < length;) {
            address oracle = oracles[i];
            address asset = assets[i];
            bool authorized = authorizations[i];

            if (oracle != address(0) && asset != address(0)) {
                bool wasAuthorized = authorizedOracles[oracle][asset];
                authorizedOracles[oracle][asset] = authorized;

                // Update oracle count
                if (authorized && !wasAuthorized) {
                    assetOracleCount[asset]++;
                } else if (!authorized && wasAuthorized) {
                    assetOracleCount[asset]--;
                }

                emit OracleAuthorizationChanged(oracle, asset, authorized, timestamp);
                emit OracleStatusChanged(oracle, authorized, timestamp);
            }
            
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Emergency pause/unpause
     * @param _paused Pause state
     */
    function setPausedState(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /**
     * @dev Emergency price update (owner only)
     * @param asset Asset address
     * @param price Emergency price
     * @param confidence Confidence level
     */
    function emergencyPriceUpdate(
        address asset,
        uint256 price,
        uint256 confidence
    ) external onlyOwner {
        if (asset == address(0) || price == 0 || confidence > 10000) revert InvalidInput();

        uint256 currentTimestamp = block.timestamp;
        uint256 newRound = latestRounds[asset] + 1;

        _latestPrices[asset] = IDataTypes.OracleData({
            oracle: msg.sender,
            asset: asset,
            price: price,
            confidence: confidence,
            timestamp: currentTimestamp,
            roundId: newRound,
            deviation: 0
        });

        latestRounds[asset] = newRound;

        emit PriceUpdated(asset, price, confidence, currentTimestamp, newRound);
        dataLogger.logOracleUpdate(msg.sender, asset, price, confidence);
    }
}