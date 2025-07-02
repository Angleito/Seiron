// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IPortfolioManager.sol";

/**
 * @title PortfolioVault
 * @dev Main vault contract for portfolio management with AI executor integration
 * @notice Manages user funds with deposit/withdraw functionality and AI-driven rebalancing
 */
contract PortfolioVault is IPortfolioManager, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @dev Portfolio structure for each user
    struct Portfolio {
        mapping(address => uint256) balances; // Asset address => balance
        uint256 totalShares; // Total shares owned by user
        uint256 lastRebalance; // Last rebalance timestamp
        bool exists; // Whether portfolio exists
    }

    /// @dev Mapping of user address to their portfolio
    mapping(address => Portfolio) private portfolios;

    /// @dev Mapping of asset address to whether it's supported
    mapping(address => bool) public supportedAssets;

    /// @dev Array of all supported assets
    address[] public assetList;

    /// @dev Total shares across all portfolios
    uint256 public override totalShares;

    /// @dev AI executor address for signature verification
    address public aiExecutor;

    /// @dev Maximum allowed slippage in basis points (10000 = 100%)
    uint256 public maxSlippage = 300; // 3% default

    /// @dev Mapping of allowed DEX routers
    mapping(address => bool) public allowedDEXs;

    /// @dev Minimum time between rebalances (anti-spam)
    uint256 public constant MIN_REBALANCE_INTERVAL = 1 hours;

    /// @dev Maximum assets per portfolio
    uint256 public constant MAX_ASSETS = 20;

    /// @dev Precision for calculations
    uint256 public constant PRECISION = 1e18;

    /// @dev Base currency for portfolio valuation (e.g., USDC)
    address public baseCurrency;

    /// @dev Oracle aggregator for price feeds
    address public oracleAggregator;

    /// @dev Emergency lock status
    bool public emergencyLocked;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _owner,
        address _aiExecutor,
        address _baseCurrency,
        address _oracleAggregator
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_aiExecutor != address(0), "Invalid AI executor");
        require(_baseCurrency != address(0), "Invalid base currency");
        require(_oracleAggregator != address(0), "Invalid oracle");

        _transferOwnership(_owner);
        aiExecutor = _aiExecutor;
        baseCurrency = _baseCurrency;
        oracleAggregator = _oracleAggregator;

        // Add base currency as first supported asset
        supportedAssets[_baseCurrency] = true;
        assetList.push(_baseCurrency);
    }

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier notEmergencyLocked() {
        require(!emergencyLocked, "Portfolio is emergency locked");
        _;
    }

    modifier onlyAIExecutor() {
        require(msg.sender == aiExecutor, "Only AI executor");
        _;
    }

    modifier validAsset(address asset) {
        require(supportedAssets[asset], "Asset not supported");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            DEPOSIT/WITHDRAW
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IPortfolioManager
     */
    function deposit(address asset, uint256 amount) 
        external 
        override 
        whenNotPaused 
        notEmergencyLocked
        validAsset(asset)
        nonReentrant 
        returns (uint256 shares) 
    {
        require(amount > 0, "Invalid amount");

        // Create portfolio if doesn't exist
        if (!portfolios[msg.sender].exists) {
            portfolios[msg.sender].exists = true;
        }

        // Transfer tokens from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares
        uint256 totalValue = calculatePortfolioValue(msg.sender);
        if (totalShares == 0 || totalValue == 0) {
            shares = amount; // First deposit, 1:1 share ratio
        } else {
            shares = (amount * totalShares) / totalValue;
        }

        // Update balances
        portfolios[msg.sender].balances[asset] += amount;
        portfolios[msg.sender].totalShares += shares;
        totalShares += shares;

        emit Deposit(msg.sender, asset, amount, shares);
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function withdraw(address asset, uint256 shares) 
        external 
        override 
        whenNotPaused
        validAsset(asset)
        nonReentrant 
        returns (uint256 amount) 
    {
        require(shares > 0, "Invalid shares");
        require(portfolios[msg.sender].totalShares >= shares, "Insufficient shares");

        Portfolio storage portfolio = portfolios[msg.sender];
        
        // Calculate amount based on share proportion
        uint256 assetBalance = portfolio.balances[asset];
        amount = (assetBalance * shares) / portfolio.totalShares;
        
        require(amount > 0, "No balance in asset");

        // Update balances
        portfolio.balances[asset] -= amount;
        portfolio.totalShares -= shares;
        totalShares -= shares;

        // Transfer tokens to user
        IERC20(asset).safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, asset, amount, shares);
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function emergencyWithdraw(string calldata reason) 
        external 
        override 
        nonReentrant 
    {
        Portfolio storage portfolio = portfolios[msg.sender];
        require(portfolio.exists, "No portfolio");

        // Withdraw all assets
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            uint256 balance = portfolio.balances[asset];
            
            if (balance > 0) {
                portfolio.balances[asset] = 0;
                IERC20(asset).safeTransfer(msg.sender, balance);
                emit EmergencyWithdrawal(msg.sender, asset, balance, reason);
            }
        }

        // Clear shares
        uint256 userShares = portfolio.totalShares;
        portfolio.totalShares = 0;
        totalShares -= userShares;
    }

    /*//////////////////////////////////////////////////////////////
                              REBALANCING
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IPortfolioManager
     */
    function rebalance(
        AssetAllocation[] calldata targetAllocations,
        bytes calldata aiSignature
    ) 
        external 
        override 
        whenNotPaused
        notEmergencyLocked
        onlyAIExecutor
    {
        // Verify signature
        bytes32 messageHash = keccak256(abi.encode(msg.sender, targetAllocations, block.timestamp));
        address signer = messageHash.toEthSignedMessageHash().recover(aiSignature);
        require(signer == aiExecutor, "Invalid AI signature");

        // Check rebalance interval
        Portfolio storage portfolio = portfolios[msg.sender];
        require(
            block.timestamp >= portfolio.lastRebalance + MIN_REBALANCE_INTERVAL,
            "Too soon to rebalance"
        );

        // Validate allocations
        _validateAllocations(targetAllocations);

        // Execute rebalance
        _executeRebalance(msg.sender, targetAllocations);

        // Update last rebalance
        portfolio.lastRebalance = block.timestamp;

        emit PortfolioRebalanced(msg.sender, block.timestamp, gasleft(), targetAllocations);
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function executeTrade(TradeParams calldata params) 
        external 
        override
        whenNotPaused
        notEmergencyLocked
        onlyAIExecutor
        returns (uint256 amountOut) 
    {
        require(allowedDEXs[params.dexRouter], "DEX not allowed");
        require(params.deadline >= block.timestamp, "Trade expired");
        require(supportedAssets[params.fromAsset], "From asset not supported");
        require(supportedAssets[params.toAsset], "To asset not supported");

        // Execute trade through DEX router
        IERC20(params.fromAsset).safeApprove(params.dexRouter, params.amount);
        
        // Call DEX router (this is a simplified version, actual implementation would vary)
        (bool success, bytes memory data) = params.dexRouter.call(params.swapData);
        require(success, "Trade execution failed");
        
        amountOut = abi.decode(data, (uint256));
        require(amountOut >= params.minAmountOut, "Slippage too high");

        emit TradeExecuted(
            msg.sender,
            params.fromAsset,
            params.toAsset,
            params.amount,
            amountOut,
            params.dexRouter
        );
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IPortfolioManager
     */
    function getPortfolioAllocations(address user) 
        external 
        view 
        override
        returns (AssetAllocation[] memory allocations) 
    {
        Portfolio storage portfolio = portfolios[user];
        uint256 totalValue = calculatePortfolioValue(user);
        
        allocations = new AssetAllocation[](assetList.length);
        
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            uint256 balance = portfolio.balances[asset];
            uint256 assetValue = _getAssetValue(asset, balance);
            
            allocations[i] = AssetAllocation({
                asset: asset,
                targetWeight: 0, // Set by AI executor
                currentWeight: totalValue > 0 ? (assetValue * 10000) / totalValue : 0,
                balance: balance
            });
        }
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function getPortfolioState(address user) 
        external 
        view 
        override
        returns (PortfolioState memory state) 
    {
        Portfolio storage portfolio = portfolios[user];
        
        state = PortfolioState({
            totalValue: calculatePortfolioValue(user),
            lastRebalance: portfolio.lastRebalance,
            rebalanceCount: 0, // Would need to track this separately
            isLocked: emergencyLocked
        });
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function calculatePortfolioValue(address user) 
        public 
        view 
        override
        returns (uint256 value) 
    {
        Portfolio storage portfolio = portfolios[user];
        
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            uint256 balance = portfolio.balances[asset];
            if (balance > 0) {
                value += _getAssetValue(asset, balance);
            }
        }
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function shareBalanceOf(address user) 
        external 
        view 
        override
        returns (uint256) 
    {
        return portfolios[user].totalShares;
    }

    /*//////////////////////////////////////////////////////////////
                          CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IPortfolioManager
     */
    function setAIAgent(address newAgent) 
        external 
        override
        onlyOwner 
    {
        require(newAgent != address(0), "Invalid agent");
        address oldAgent = aiExecutor;
        aiExecutor = newAgent;
        emit AIAgentUpdated(oldAgent, newAgent, block.timestamp);
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function setMaxSlippage(uint256 slippage) 
        external 
        override
        onlyOwner 
    {
        require(slippage <= 1000, "Slippage too high"); // Max 10%
        uint256 oldSlippage = maxSlippage;
        maxSlippage = slippage;
        emit MaxSlippageUpdated(oldSlippage, slippage);
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function setAllowedDEX(address dexRouter, bool allowed) 
        external 
        override
        onlyOwner 
    {
        allowedDEXs[dexRouter] = allowed;
        emit AllowedDEXUpdated(dexRouter, allowed);
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function lockPortfolio(string calldata reason) 
        external 
        override
        onlyOwner 
    {
        emergencyLocked = true;
        emit PortfolioLocked(msg.sender, reason, block.timestamp);
    }

    /**
     * @inheritdoc IPortfolioManager
     */
    function unlockPortfolio() 
        external 
        override
        onlyOwner 
    {
        emergencyLocked = false;
        emit PortfolioUnlocked(msg.sender, block.timestamp);
    }

    /**
     * @dev Add new supported asset
     * @param asset The asset address to add
     */
    function addSupportedAsset(address asset) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        require(!supportedAssets[asset], "Asset already supported");
        require(assetList.length < MAX_ASSETS, "Max assets reached");
        
        supportedAssets[asset] = true;
        assetList.push(asset);
    }

    /**
     * @dev Remove supported asset
     * @param asset The asset address to remove
     */
    function removeSupportedAsset(address asset) external onlyOwner {
        require(supportedAssets[asset], "Asset not supported");
        require(asset != baseCurrency, "Cannot remove base currency");
        
        supportedAssets[asset] = false;
        
        // Remove from assetList
        for (uint256 i = 0; i < assetList.length; i++) {
            if (assetList[i] == asset) {
                assetList[i] = assetList[assetList.length - 1];
                assetList.pop();
                break;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validate asset allocations
     * @param allocations The target allocations
     */
    function _validateAllocations(AssetAllocation[] calldata allocations) internal view {
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < allocations.length; i++) {
            require(supportedAssets[allocations[i].asset], "Asset not supported");
            totalWeight += allocations[i].targetWeight;
        }
        
        require(totalWeight == 10000, "Weights must sum to 100%");
    }

    /**
     * @dev Execute portfolio rebalance
     * @param user The user address
     * @param targetAllocations The target allocations
     */
    function _executeRebalance(
        address user,
        AssetAllocation[] calldata targetAllocations
    ) internal {
        // Implementation would execute trades to reach target allocations
        // This is simplified - actual implementation would be more complex
    }

    /**
     * @dev Get asset value in base currency
     * @param asset The asset address
     * @param amount The asset amount
     * @return value The value in base currency
     */
    function _getAssetValue(address asset, uint256 amount) internal view returns (uint256) {
        if (asset == baseCurrency) {
            return amount;
        }
        
        // Would call oracle aggregator for price
        // This is a placeholder
        return amount; // Simplified for now
    }

    /**
     * @dev Pause contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}