// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPortfolioManager
 * @dev Interface for the main portfolio management contract
 * @notice Defines the standard functions for portfolio management with AI integration
 */
interface IPortfolioManager {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Portfolio asset allocation structure
     * @param asset The asset address
     * @param targetWeight The target portfolio weight (basis points, 10000 = 100%)
     * @param currentWeight The current portfolio weight
     * @param balance The current balance of the asset
     */
    struct AssetAllocation {
        address asset;
        uint256 targetWeight;
        uint256 currentWeight;
        uint256 balance;
    }

    /**
     * @dev Trade execution parameters
     * @param fromAsset The asset to sell
     * @param toAsset The asset to buy
     * @param amount The amount to trade
     * @param minAmountOut The minimum amount to receive
     * @param dexRouter The DEX router address
     * @param swapData The encoded swap data for the DEX
     * @param deadline The trade deadline timestamp
     */
    struct TradeParams {
        address fromAsset;
        address toAsset;
        uint256 amount;
        uint256 minAmountOut;
        address dexRouter;
        bytes swapData;
        uint256 deadline;
    }

    /**
     * @dev Portfolio state information
     * @param totalValue The total portfolio value in base currency
     * @param lastRebalance The timestamp of last rebalance
     * @param rebalanceCount The total number of rebalances
     * @param isLocked Whether the portfolio is locked for emergency
     */
    struct PortfolioState {
        uint256 totalValue;
        uint256 lastRebalance;
        uint256 rebalanceCount;
        bool isLocked;
    }

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PortfolioRebalanced(
        address indexed user,
        uint256 timestamp,
        uint256 gasUsed,
        AssetAllocation[] newAllocations
    );

    event TradeExecuted(
        address indexed user,
        address indexed fromAsset,
        address indexed toAsset,
        uint256 amountIn,
        uint256 amountOut,
        address dexRouter
    );

    event Deposit(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );

    event Withdrawal(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );

    event EmergencyWithdrawal(
        address indexed user,
        address indexed asset,
        uint256 amount,
        string reason
    );

    event AIAgentUpdated(
        address indexed oldAgent,
        address indexed newAgent,
        uint256 timestamp
    );

    event PortfolioLocked(
        address indexed locker,
        string reason,
        uint256 timestamp
    );

    event PortfolioUnlocked(
        address indexed unlocker,
        uint256 timestamp
    );

    event MaxSlippageUpdated(
        uint256 oldSlippage,
        uint256 newSlippage
    );

    event AllowedDEXUpdated(
        address indexed dexRouter,
        bool allowed
    );

    /*//////////////////////////////////////////////////////////////
                            PORTFOLIO FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Deposit assets into the portfolio
     * @param asset The asset to deposit
     * @param amount The amount to deposit
     * @return shares The portfolio shares minted
     */
    function deposit(address asset, uint256 amount) external returns (uint256 shares);

    /**
     * @dev Withdraw assets from the portfolio
     * @param asset The asset to withdraw
     * @param shares The portfolio shares to burn
     * @return amount The amount withdrawn
     */
    function withdraw(address asset, uint256 shares) external returns (uint256 amount);

    /**
     * @dev Emergency withdrawal of all user assets
     * @param reason The reason for emergency withdrawal
     */
    function emergencyWithdraw(string calldata reason) external;

    /**
     * @dev Rebalance portfolio according to AI-determined weights
     * @param targetAllocations The target asset allocations
     * @param aiSignature The AI agent's signature validating the rebalance
     */
    function rebalance(
        AssetAllocation[] calldata targetAllocations,
        bytes calldata aiSignature
    ) external;

    /**
     * @dev Execute a single trade as part of rebalancing
     * @param params The trade execution parameters
     * @return amountOut The amount received from the trade
     */
    function executeTrade(TradeParams calldata params) external returns (uint256 amountOut);

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get current portfolio allocations
     * @param user The user address
     * @return allocations The current asset allocations
     */
    function getPortfolioAllocations(address user) 
        external 
        view 
        returns (AssetAllocation[] memory allocations);

    /**
     * @dev Get portfolio state information
     * @param user The user address
     * @return state The portfolio state
     */
    function getPortfolioState(address user) 
        external 
        view 
        returns (PortfolioState memory state);

    /**
     * @dev Calculate portfolio value in base currency
     * @param user The user address
     * @return value The total portfolio value
     */
    function calculatePortfolioValue(address user) external view returns (uint256 value);

    /**
     * @dev Get user's share balance
     * @param user The user address
     * @return balance The share balance
     */
    function shareBalanceOf(address user) external view returns (uint256 balance);

    /**
     * @dev Get total shares supply
     * @return supply The total shares supply
     */
    function totalShares() external view returns (uint256 supply);

    /*//////////////////////////////////////////////////////////////
                        CONFIGURATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set the AI agent address
     * @param newAgent The new AI agent address
     */
    function setAIAgent(address newAgent) external;

    /**
     * @dev Set maximum allowed slippage
     * @param slippage The max slippage in basis points
     */
    function setMaxSlippage(uint256 slippage) external;

    /**
     * @dev Update DEX router allowlist
     * @param dexRouter The DEX router address
     * @param allowed Whether the router is allowed
     */
    function setAllowedDEX(address dexRouter, bool allowed) external;

    /**
     * @dev Lock portfolio for emergency
     * @param reason The lock reason
     */
    function lockPortfolio(string calldata reason) external;

    /**
     * @dev Unlock portfolio
     */
    function unlockPortfolio() external;
}