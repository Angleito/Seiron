// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IDataLogger.sol";
import "./interfaces/IOracle.sol";

/**
 * @title DataLogger
 * @dev Main contract for logging portfolio events and data on Sei blockchain
 * @notice Optimized for Sei's 400ms block times and parallel execution
 * @notice Focuses on event emission for off-chain data collection with minimal storage
 */
contract DataLogger is IDataLogger {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @dev Contract owner address
    address public immutable owner;

    /// @dev Total number of events logged (minimal storage for gas optimization)
    uint256 private _totalEventCount;

    /// @dev Mapping to track authorized loggers
    mapping(address => bool) public authorizedLoggers;

    /// @dev Mapping to track last activity timestamp per user (for behavior analysis)
    mapping(address => uint256) public lastUserActivity;

    /// @dev Emergency pause state
    bool public paused;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Emitted when a logger is authorized/deauthorized
    event LoggerAuthorizationChanged(address indexed logger, bool authorized, uint256 timestamp);

    /// @dev Emitted when contract is paused/unpaused
    event PausedStateChanged(bool paused, uint256 timestamp);

    /// @dev Emitted when ownership is transferred
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error Unauthorized();
    error ContractPaused();
    error InvalidInput();
    error ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedLoggers[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor sets the contract owner and initializes authorized loggers
     * @param _owner The owner address
     * @param _initialLoggers Array of initial authorized logger addresses
     */
    constructor(address _owner, address[] memory _initialLoggers) validAddress(_owner) {
        owner = _owner;
        
        // Authorize initial loggers
        for (uint256 i = 0; i < _initialLoggers.length; i++) {
            if (_initialLoggers[i] != address(0)) {
                authorizedLoggers[_initialLoggers[i]] = true;
                emit LoggerAuthorizationChanged(_initialLoggers[i], true, block.timestamp);
            }
        }

        // Authorize owner as logger
        authorizedLoggers[_owner] = true;
        emit LoggerAuthorizationChanged(_owner, true, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                            CORE LOGGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IDataLogger
     * @dev Gas-optimized function focusing on event emission
     */
    function logPortfolioAction(
        address user,
        string memory action,
        address asset,
        uint256 amount,
        uint256 price
    ) external override onlyAuthorized whenNotPaused validAddress(user) validAddress(asset) {
        if (bytes(action).length == 0 || amount == 0) revert InvalidInput();

        // Update minimal storage
        unchecked {
            ++_totalEventCount;
        }
        lastUserActivity[user] = block.timestamp;

        // Emit comprehensive event for off-chain collection
        emit PortfolioAction(
            user,
            action,
            asset,
            amount,
            price,
            block.timestamp,
            block.number
        );
    }

    /**
     * @inheritdoc IDataLogger
     * @dev Optimized for high-frequency market data logging
     */
    function logMarketData(
        address asset,
        uint256 price,
        uint256 volume,
        uint256 volatility
    ) external override onlyAuthorized whenNotPaused validAddress(asset) {
        if (price == 0) revert InvalidInput();

        unchecked {
            ++_totalEventCount;
        }

        emit MarketData(
            asset,
            price,
            volume,
            volatility,
            block.timestamp,
            block.number
        );
    }

    /**
     * @inheritdoc IDataLogger
     * @dev Logs user behavior patterns for AI training
     */
    function logUserBehavior(
        address user,
        string memory behaviorType,
        uint256 score,
        bytes memory metadata
    ) external override onlyAuthorized whenNotPaused validAddress(user) {
        if (bytes(behaviorType).length == 0) revert InvalidInput();

        unchecked {
            ++_totalEventCount;
        }
        lastUserActivity[user] = block.timestamp;

        emit UserBehavior(
            user,
            behaviorType,
            score,
            metadata,
            block.timestamp
        );
    }

    /**
     * @inheritdoc IDataLogger
     * @dev Logs oracle price updates with confidence metrics
     */
    function logOracleUpdate(
        address oracle,
        address asset,
        uint256 price,
        uint256 confidence
    ) external override onlyAuthorized whenNotPaused validAddress(oracle) validAddress(asset) {
        if (price == 0 || confidence > 10000) revert InvalidInput();

        unchecked {
            ++_totalEventCount;
        }

        emit OracleUpdate(
            oracle,
            asset,
            price,
            confidence,
            block.timestamp
        );
    }

    /*//////////////////////////////////////////////////////////////
                            BATCH LOGGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Batch log multiple portfolio actions (gas optimization for Sei)
     * @param users Array of user addresses
     * @param actions Array of action types
     * @param assets Array of asset addresses
     * @param amounts Array of amounts
     * @param prices Array of prices
     */
    function batchLogPortfolioActions(
        address[] memory users,
        string[] memory actions,
        address[] memory assets,
        uint256[] memory amounts,
        uint256[] memory prices
    ) external onlyAuthorized whenNotPaused {
        uint256 length = users.length;
        if (length != actions.length || length != assets.length || 
            length != amounts.length || length != prices.length) {
            revert InvalidInput();
        }

        uint256 timestamp = block.timestamp;
        uint256 blockNumber = block.number;

        for (uint256 i = 0; i < length;) {
            if (users[i] != address(0) && assets[i] != address(0) && 
                bytes(actions[i]).length > 0 && amounts[i] > 0) {
                
                lastUserActivity[users[i]] = timestamp;
                
                emit PortfolioAction(
                    users[i],
                    actions[i],
                    assets[i],
                    amounts[i],
                    prices[i],
                    timestamp,
                    blockNumber
                );
            }
            
            unchecked {
                ++i;
            }
        }

        unchecked {
            _totalEventCount += length;
        }
    }

    /**
     * @dev Batch log market data for multiple assets
     * @param assets Array of asset addresses
     * @param prices Array of prices
     * @param volumes Array of volumes
     * @param volatilities Array of volatilities
     */
    function batchLogMarketData(
        address[] memory assets,
        uint256[] memory prices,
        uint256[] memory volumes,
        uint256[] memory volatilities
    ) external onlyAuthorized whenNotPaused {
        uint256 length = assets.length;
        if (length != prices.length || length != volumes.length || length != volatilities.length) {
            revert InvalidInput();
        }

        uint256 timestamp = block.timestamp;
        uint256 blockNumber = block.number;

        for (uint256 i = 0; i < length;) {
            if (assets[i] != address(0) && prices[i] > 0) {
                emit MarketData(
                    assets[i],
                    prices[i],
                    volumes[i],
                    volatilities[i],
                    timestamp,
                    blockNumber
                );
            }
            
            unchecked {
                ++i;
            }
        }

        unchecked {
            _totalEventCount += length;
        }
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDataLogger
    function getTotalEventCount() external view override returns (uint256) {
        return _totalEventCount;
    }

    /// @inheritdoc IDataLogger
    function getLastUserActivity(address user) external view override returns (uint256) {
        return lastUserActivity[user];
    }

    /// @inheritdoc IDataLogger
    function isAuthorizedLogger(address logger) external view override returns (bool) {
        return authorizedLoggers[logger];
    }

    /**
     * @dev Returns contract metadata for off-chain systems
     * @return totalEvents Total events logged
     * @return contractOwner Owner address
     * @return isPaused Current pause state
     * @return blockNumber Current block number
     * @return timestamp Current timestamp
     */
    function getContractInfo() external view returns (
        uint256 totalEvents,
        address contractOwner,
        bool isPaused,
        uint256 blockNumber,
        uint256 timestamp
    ) {
        return (
            _totalEventCount,
            owner,
            paused,
            block.number,
            block.timestamp
        );
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Authorize or deauthorize a logger
     * @param logger The logger address
     * @param authorized The authorization status
     */
    function setLoggerAuthorization(address logger, bool authorized) 
        external 
        onlyOwner 
        validAddress(logger) 
    {
        authorizedLoggers[logger] = authorized;
        emit LoggerAuthorizationChanged(logger, authorized, block.timestamp);
    }

    /**
     * @dev Batch authorize multiple loggers
     * @param loggers Array of logger addresses
     * @param authorizations Array of authorization statuses
     */
    function batchSetLoggerAuthorization(
        address[] memory loggers,
        bool[] memory authorizations
    ) external onlyOwner {
        if (loggers.length != authorizations.length) revert InvalidInput();

        uint256 timestamp = block.timestamp;
        for (uint256 i = 0; i < loggers.length;) {
            if (loggers[i] != address(0)) {
                authorizedLoggers[loggers[i]] = authorizations[i];
                emit LoggerAuthorizationChanged(loggers[i], authorizations[i], timestamp);
            }
            
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Emergency pause/unpause contract
     * @param _paused The pause state
     */
    function setPausedState(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                            UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emergency function to emit a custom event for debugging
     * @param eventData Custom event data
     */
    function emitCustomEvent(bytes memory eventData) external onlyOwner {
        // Custom event for emergency debugging or special data collection
        assembly {
            log1(add(eventData, 0x20), mload(eventData), keccak256("CustomDebugEvent(bytes)", 19))
        }
    }
}