// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IOracle
 * @dev Interface for oracle interactions optimized for Sei blockchain
 * @notice This interface defines the standard oracle functionality for price feeds
 */
interface IOracle {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a price is updated
     * @param asset The asset address
     * @param price The new price
     * @param confidence The confidence level (0-10000, where 10000 = 100%)
     * @param timestamp The timestamp of the update
     * @param round The round ID of the update
     */
    event PriceUpdated(
        address indexed asset,
        uint256 price,
        uint256 confidence,
        uint256 timestamp,
        uint256 indexed round
    );

    /**
     * @dev Emitted when an oracle is activated/deactivated
     * @param oracle The oracle address
     * @param active The activation status
     * @param timestamp The timestamp of the change
     */
    event OracleStatusChanged(
        address indexed oracle,
        bool active,
        uint256 timestamp
    );

    /**
     * @dev Emitted when oracle data is aggregated
     * @param asset The asset address
     * @param aggregatedPrice The final aggregated price
     * @param sources The number of sources used
     * @param timestamp The aggregation timestamp
     */
    event PriceAggregated(
        address indexed asset,
        uint256 aggregatedPrice,
        uint256 sources,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                            CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the latest price for an asset
     * @param asset The asset address
     * @return price The latest price
     * @return confidence The confidence level
     * @return timestamp The timestamp of the price
     */
    function getLatestPrice(address asset)
        external
        view
        returns (
            uint256 price,
            uint256 confidence,
            uint256 timestamp
        );

    /**
     * @dev Returns historical price data
     * @param asset The asset address
     * @param roundId The round ID to query
     * @return price The price at that round
     * @return confidence The confidence level
     * @return timestamp The timestamp
     */
    function getHistoricalPrice(address asset, uint256 roundId)
        external
        view
        returns (
            uint256 price,
            uint256 confidence,
            uint256 timestamp
        );

    /**
     * @dev Updates the price for an asset (only authorized oracles)
     * @param asset The asset address
     * @param price The new price
     * @param confidence The confidence level
     */
    function updatePrice(
        address asset,
        uint256 price,
        uint256 confidence
    ) external;

    /**
     * @dev Batch update prices for multiple assets
     * @param assets Array of asset addresses
     * @param prices Array of prices
     * @param confidences Array of confidence levels
     */
    function batchUpdatePrices(
        address[] memory assets,
        uint256[] memory prices,
        uint256[] memory confidences
    ) external;

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the number of active oracles for an asset
     * @param asset The asset address
     * @return The number of active oracles
     */
    function getActiveOracleCount(address asset) external view returns (uint256);

    /**
     * @dev Returns the minimum confidence threshold
     * @return The minimum confidence threshold
     */
    function getMinConfidenceThreshold() external view returns (uint256);

    /**
     * @dev Returns the latest round ID for an asset
     * @param asset The asset address
     * @return The latest round ID
     */
    function getLatestRound(address asset) external view returns (uint256);

    /**
     * @dev Checks if an oracle is authorized for an asset
     * @param oracle The oracle address
     * @param asset The asset address
     * @return True if authorized
     */
    function isAuthorizedOracle(address oracle, address asset) external view returns (bool);

    /**
     * @dev Returns the price deviation threshold
     * @return The maximum allowed price deviation (in basis points)
     */
    function getPriceDeviationThreshold() external view returns (uint256);
}