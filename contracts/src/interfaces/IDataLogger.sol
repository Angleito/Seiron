// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDataLogger
 * @dev Interface for the DataLogger contract optimized for Sei blockchain
 * @notice This interface defines the core data logging functionality for portfolio events
 */
interface IDataLogger {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a portfolio action is logged
     * @param user The address of the user performing the action
     * @param action The type of action performed (buy, sell, stake, unstake, etc.)
     * @param asset The asset address involved in the action
     * @param amount The amount involved in the action
     * @param price The price at which the action was executed
     * @param timestamp The timestamp of the action
     * @param blockNumber The block number when the action occurred
     */
    event PortfolioAction(
        address indexed user,
        string indexed action,
        address indexed asset,
        uint256 amount,
        uint256 price,
        uint256 timestamp,
        uint256 blockNumber
    );

    /**
     * @dev Emitted when market data is logged
     * @param asset The asset address
     * @param price The current price
     * @param volume The trading volume
     * @param volatility The volatility metric
     * @param timestamp The timestamp of the data
     * @param blockNumber The block number when the data was recorded
     */
    event MarketData(
        address indexed asset,
        uint256 price,
        uint256 volume,
        uint256 volatility,
        uint256 timestamp,
        uint256 blockNumber
    );

    /**
     * @dev Emitted when user behavior is logged
     * @param user The user address
     * @param behaviorType The type of behavior (risk_taking, conservative, etc.)
     * @param score The behavior score
     * @param metadata Additional metadata about the behavior
     * @param timestamp The timestamp of the behavior
     */
    event UserBehavior(
        address indexed user,
        string indexed behaviorType,
        uint256 score,
        bytes metadata,
        uint256 timestamp
    );

    /**
     * @dev Emitted when oracle data is updated
     * @param oracle The oracle address
     * @param asset The asset address
     * @param price The updated price
     * @param confidence The confidence level of the price
     * @param timestamp The timestamp of the update
     */
    event OracleUpdate(
        address indexed oracle,
        address indexed asset,
        uint256 price,
        uint256 confidence,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                            CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Logs a portfolio action
     * @param user The user performing the action
     * @param action The action type
     * @param asset The asset involved
     * @param amount The amount
     * @param price The execution price
     */
    function logPortfolioAction(
        address user,
        string memory action,
        address asset,
        uint256 amount,
        uint256 price
    ) external;

    /**
     * @dev Logs market data
     * @param asset The asset address
     * @param price The current price
     * @param volume The trading volume
     * @param volatility The volatility metric
     */
    function logMarketData(
        address asset,
        uint256 price,
        uint256 volume,
        uint256 volatility
    ) external;

    /**
     * @dev Logs user behavior data
     * @param user The user address
     * @param behaviorType The behavior type
     * @param score The behavior score
     * @param metadata Additional metadata
     */
    function logUserBehavior(
        address user,
        string memory behaviorType,
        uint256 score,
        bytes memory metadata
    ) external;

    /**
     * @dev Logs oracle data update
     * @param oracle The oracle address
     * @param asset The asset address
     * @param price The updated price
     * @param confidence The confidence level
     */
    function logOracleUpdate(
        address oracle,
        address asset,
        uint256 price,
        uint256 confidence
    ) external;

    /*//////////////////////////////////////////////////////////////
                                GETTERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the total number of events logged
     * @return The total event count
     */
    function getTotalEventCount() external view returns (uint256);

    /**
     * @dev Returns the last logged timestamp for a user
     * @param user The user address
     * @return The last timestamp
     */
    function getLastUserActivity(address user) external view returns (uint256);

    /**
     * @dev Checks if an address is authorized to log data
     * @param logger The logger address to check
     * @return True if authorized
     */
    function isAuthorizedLogger(address logger) external view returns (bool);
}