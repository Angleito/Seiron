// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDataTypes
 * @dev Common data structures and types for the Sei data logging system
 * @notice Defines standard data structures used across the logging ecosystem
 */
interface IDataTypes {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Portfolio action data structure
     * @param user The user address
     * @param action The action type (buy, sell, stake, etc.)
     * @param asset The asset address
     * @param amount The amount involved
     * @param price The execution price
     * @param timestamp The action timestamp
     * @param blockNumber The block number
     * @param gasUsed The gas used for the transaction
     */
    struct PortfolioAction {
        address user;
        string action;
        address asset;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        uint256 blockNumber;
        uint256 gasUsed;
    }

    /**
     * @dev Market data structure
     * @param asset The asset address
     * @param price The current price
     * @param volume The 24h trading volume
     * @param volatility The volatility metric
     * @param marketCap The market capitalization
     * @param timestamp The data timestamp
     * @param source The data source identifier
     */
    struct MarketData {
        address asset;
        uint256 price;
        uint256 volume;
        uint256 volatility;
        uint256 marketCap;
        uint256 timestamp;
        bytes32 source;
    }

    /**
     * @dev User behavior data structure
     * @param user The user address
     * @param behaviorType The behavior classification
     * @param riskScore The risk assessment score (0-10000)
     * @param activityScore The activity level score (0-10000)
     * @param timestamp The behavior timestamp
     * @param metadata Additional behavior metadata
     */
    struct UserBehavior {
        address user;
        string behaviorType;
        uint256 riskScore;
        uint256 activityScore;
        uint256 timestamp;
        bytes metadata;
    }

    /**
     * @dev Oracle price data structure
     * @param oracle The oracle address
     * @param asset The asset address
     * @param price The reported price
     * @param confidence The confidence level (0-10000)
     * @param timestamp The update timestamp
     * @param roundId The oracle round identifier
     * @param deviation The price deviation from previous round
     */
    struct OracleData {
        address oracle;
        address asset;
        uint256 price;
        uint256 confidence;
        uint256 timestamp;
        uint256 roundId;
        uint256 deviation;
    }

    /**
     * @dev Network statistics structure for Sei optimization
     * @param blockNumber The current block number
     * @param blockTime The block time in milliseconds
     * @param gasPrice The current gas price
     * @param networkLoad The network load percentage (0-10000)
     * @param parallelTxCount The number of parallel transactions
     * @param avgConfirmationTime The average confirmation time
     */
    struct NetworkStats {
        uint256 blockNumber;
        uint256 blockTime;
        uint256 gasPrice;
        uint256 networkLoad;
        uint256 parallelTxCount;
        uint256 avgConfirmationTime;
    }

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Portfolio action types
     */
    enum ActionType {
        BUY,
        SELL,
        STAKE,
        UNSTAKE,
        CLAIM_REWARDS,
        PROVIDE_LIQUIDITY,
        REMOVE_LIQUIDITY,
        SWAP,
        BRIDGE_IN,
        BRIDGE_OUT,
        LEND,
        BORROW,
        REPAY,
        LIQUIDATE
    }

    /**
     * @dev User behavior classifications
     */
    enum BehaviorType {
        CONSERVATIVE,
        MODERATE,
        AGGRESSIVE,
        DAY_TRADER,
        HODLER,
        YIELD_FARMER,
        ARBITRAGEUR,
        WHALE,
        RETAIL,
        INSTITUTIONAL
    }

    /**
     * @dev Oracle data quality levels
     */
    enum DataQuality {
        LOW,        // 0-2500 confidence
        MEDIUM,     // 2501-7500 confidence
        HIGH,       // 7501-9500 confidence
        EXCELLENT   // 9501-10000 confidence
    }

    /**
     * @dev Market conditions
     */
    enum MarketCondition {
        BULL,
        BEAR,
        SIDEWAYS,
        VOLATILE,
        STABLE
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Maximum confidence level (100.00%)
    uint256 constant MAX_CONFIDENCE = 10000;

    /// @dev Maximum risk score (100.00%)
    uint256 constant MAX_RISK_SCORE = 10000;

    /// @dev Maximum activity score (100.00%)
    uint256 constant MAX_ACTIVITY_SCORE = 10000;

    /// @dev Sei network target block time (400ms)
    uint256 constant SEI_BLOCK_TIME = 400;

    /// @dev Maximum batch size for operations
    uint256 constant MAX_BATCH_SIZE = 100;

    /// @dev Price deviation threshold (5.00%)
    uint256 constant PRICE_DEVIATION_THRESHOLD = 500;
}