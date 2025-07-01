// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/DataLogger.sol";
import "../src/OracleAggregator.sol";
import "../src/interfaces/IDataLogger.sol";

/**
 * @title DataLoggerTest
 * @dev Comprehensive tests for the Sei blockchain data logging system
 * @notice Tests optimized for Sei's 400ms block times and parallel execution
 */
contract DataLoggerTest is Test {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    DataLogger public dataLogger;
    OracleAggregator public oracleAggregator;
    
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public oracle1 = address(0x4);
    address public oracle2 = address(0x5);
    address public asset1 = address(0x6);
    address public asset2 = address(0x7);
    address public unauthorizedUser = address(0x8);

    // Test event tracking
    event PortfolioAction(
        address indexed user,
        string indexed action,
        address indexed asset,
        uint256 amount,
        uint256 price,
        uint256 timestamp,
        uint256 blockNumber
    );

    event MarketData(
        address indexed asset,
        uint256 price,
        uint256 volume,
        uint256 volatility,
        uint256 timestamp,
        uint256 blockNumber
    );

    /*//////////////////////////////////////////////////////////////
                                SETUP
    //////////////////////////////////////////////////////////////*/

    function setUp() public {
        vm.warp(1000000); // Set initial timestamp
        
        // Deploy contracts
        address[] memory initialLoggers = new address[](2);
        initialLoggers[0] = user1;
        initialLoggers[1] = user2;
        
        dataLogger = new DataLogger(owner, initialLoggers);
        oracleAggregator = new OracleAggregator(owner, address(dataLogger));
        
        // Setup authorizations
        vm.startPrank(owner);
        dataLogger.setLoggerAuthorization(address(oracleAggregator), true);
        oracleAggregator.setOracleAuthorization(oracle1, asset1, true);
        oracleAggregator.setOracleAuthorization(oracle2, asset2, true);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                            DATALOGGER TESTS
    //////////////////////////////////////////////////////////////*/

    function testInitialSetup() public {
        assertEq(dataLogger.owner(), owner);
        assertTrue(dataLogger.isAuthorizedLogger(owner));
        assertTrue(dataLogger.isAuthorizedLogger(user1));
        assertTrue(dataLogger.isAuthorizedLogger(user2));
        assertFalse(dataLogger.isAuthorizedLogger(unauthorizedUser));
        assertEq(dataLogger.getTotalEventCount(), 0);
    }

    function testLogPortfolioAction() public {
        vm.startPrank(user1);
        
        // Test successful portfolio action logging
        vm.expectEmit(true, true, true, true);
        emit PortfolioAction(
            user2,
            "buy",
            asset1,
            1000,
            100,
            block.timestamp,
            block.number
        );
        
        dataLogger.logPortfolioAction(user2, "buy", asset1, 1000, 100);
        
        assertEq(dataLogger.getTotalEventCount(), 1);
        assertEq(dataLogger.getLastUserActivity(user2), block.timestamp);
        
        vm.stopPrank();
    }

    function testLogPortfolioActionUnauthorized() public {
        vm.startPrank(unauthorizedUser);
        
        vm.expectRevert(DataLogger.Unauthorized.selector);
        dataLogger.logPortfolioAction(user2, "buy", asset1, 1000, 100);
        
        vm.stopPrank();
    }

    function testLogPortfolioActionInvalidInput() public {
        vm.startPrank(user1);
        
        // Test zero address user
        vm.expectRevert(DataLogger.ZeroAddress.selector);
        dataLogger.logPortfolioAction(address(0), "buy", asset1, 1000, 100);
        
        // Test zero address asset
        vm.expectRevert(DataLogger.ZeroAddress.selector);
        dataLogger.logPortfolioAction(user2, "buy", address(0), 1000, 100);
        
        // Test empty action
        vm.expectRevert(DataLogger.InvalidInput.selector);
        dataLogger.logPortfolioAction(user2, "", asset1, 1000, 100);
        
        // Test zero amount
        vm.expectRevert(DataLogger.InvalidInput.selector);
        dataLogger.logPortfolioAction(user2, "buy", asset1, 0, 100);
        
        vm.stopPrank();
    }

    function testLogMarketData() public {
        vm.startPrank(user1);
        
        vm.expectEmit(true, false, false, true);
        emit MarketData(
            asset1,
            1000,
            50000,
            250, // 2.5% volatility
            block.timestamp,
            block.number
        );
        
        dataLogger.logMarketData(asset1, 1000, 50000, 250);
        
        assertEq(dataLogger.getTotalEventCount(), 1);
        
        vm.stopPrank();
    }

    function testLogUserBehavior() public {
        vm.startPrank(user1);
        
        bytes memory metadata = abi.encode("risk_score", 7500);
        dataLogger.logUserBehavior(user2, "aggressive", 8000, metadata);
        
        assertEq(dataLogger.getTotalEventCount(), 1);
        assertEq(dataLogger.getLastUserActivity(user2), block.timestamp);
        
        vm.stopPrank();
    }

    function testBatchLogPortfolioActions() public {
        vm.startPrank(user1);
        
        // Prepare batch data
        address[] memory users = new address[](3);
        string[] memory actions = new string[](3);
        address[] memory assets = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        uint256[] memory prices = new uint256[](3);
        
        users[0] = user1;
        users[1] = user2;
        users[2] = user1;
        
        actions[0] = "buy";
        actions[1] = "sell";
        actions[2] = "stake";
        
        assets[0] = asset1;
        assets[1] = asset2;
        assets[2] = asset1;
        
        amounts[0] = 1000;
        amounts[1] = 500;
        amounts[2] = 750;
        
        prices[0] = 100;
        prices[1] = 200;
        prices[2] = 105;
        
        dataLogger.batchLogPortfolioActions(users, actions, assets, amounts, prices);
        
        assertEq(dataLogger.getTotalEventCount(), 3);
        assertEq(dataLogger.getLastUserActivity(user1), block.timestamp);
        assertEq(dataLogger.getLastUserActivity(user2), block.timestamp);
        
        vm.stopPrank();
    }

    function testBatchLogMarketData() public {
        vm.startPrank(user1);
        
        address[] memory assets = new address[](2);
        uint256[] memory prices = new uint256[](2);
        uint256[] memory volumes = new uint256[](2);
        uint256[] memory volatilities = new uint256[](2);
        
        assets[0] = asset1;
        assets[1] = asset2;
        prices[0] = 1000;
        prices[1] = 2000;
        volumes[0] = 50000;
        volumes[1] = 75000;
        volatilities[0] = 250;
        volatilities[1] = 180;
        
        dataLogger.batchLogMarketData(assets, prices, volumes, volatilities);
        
        assertEq(dataLogger.getTotalEventCount(), 2);
        
        vm.stopPrank();
    }

    function testPauseFunctionality() public {
        vm.startPrank(owner);
        
        // Pause contract
        dataLogger.setPausedState(true);
        assertTrue(dataLogger.paused());
        
        vm.stopPrank();
        
        // Try to log when paused
        vm.startPrank(user1);
        
        vm.expectRevert(DataLogger.ContractPaused.selector);
        dataLogger.logPortfolioAction(user2, "buy", asset1, 1000, 100);
        
        vm.stopPrank();
        
        // Unpause and test normal operation
        vm.startPrank(owner);
        dataLogger.setPausedState(false);
        assertFalse(dataLogger.paused());
        vm.stopPrank();
        
        vm.startPrank(user1);
        dataLogger.logPortfolioAction(user2, "buy", asset1, 1000, 100);
        assertEq(dataLogger.getTotalEventCount(), 1);
        vm.stopPrank();
    }

    function testLoggerAuthorization() public {
        vm.startPrank(owner);
        
        // Deauthorize user1
        dataLogger.setLoggerAuthorization(user1, false);
        assertFalse(dataLogger.isAuthorizedLogger(user1));
        
        // Authorize new user
        dataLogger.setLoggerAuthorization(unauthorizedUser, true);
        assertTrue(dataLogger.isAuthorizedLogger(unauthorizedUser));
        
        vm.stopPrank();
        
        // Test deauthorized user can't log
        vm.startPrank(user1);
        vm.expectRevert(DataLogger.Unauthorized.selector);
        dataLogger.logPortfolioAction(user2, "buy", asset1, 1000, 100);
        vm.stopPrank();
        
        // Test newly authorized user can log
        vm.startPrank(unauthorizedUser);
        dataLogger.logPortfolioAction(user2, "buy", asset1, 1000, 100);
        assertEq(dataLogger.getTotalEventCount(), 1);
        vm.stopPrank();
    }

    function testBatchLoggerAuthorization() public {
        vm.startPrank(owner);
        
        address[] memory loggers = new address[](2);
        bool[] memory authorizations = new bool[](2);
        
        loggers[0] = user1;
        loggers[1] = unauthorizedUser;
        authorizations[0] = false;
        authorizations[1] = true;
        
        dataLogger.batchSetLoggerAuthorization(loggers, authorizations);
        
        assertFalse(dataLogger.isAuthorizedLogger(user1));
        assertTrue(dataLogger.isAuthorizedLogger(unauthorizedUser));
        
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        ORACLE AGGREGATOR TESTS
    //////////////////////////////////////////////////////////////*/

    function testOracleAggregatorSetup() public {
        assertEq(oracleAggregator.owner(), owner);
        assertEq(address(oracleAggregator.dataLogger()), address(dataLogger));
        assertTrue(oracleAggregator.isAuthorizedOracle(oracle1, asset1));
        assertTrue(oracleAggregator.isAuthorizedOracle(oracle2, asset2));
        assertFalse(oracleAggregator.isAuthorizedOracle(oracle1, asset2));
    }

    function testOraclePriceUpdate() public {
        vm.startPrank(oracle1);
        
        oracleAggregator.updatePrice(asset1, 1000, 9500);
        
        (uint256 price, uint256 confidence, uint256 timestamp) = oracleAggregator.getLatestPrice(asset1);
        assertEq(price, 1000);
        assertEq(confidence, 9500);
        assertEq(timestamp, block.timestamp);
        assertEq(oracleAggregator.getLatestRound(asset1), 1);
        
        vm.stopPrank();
    }

    function testOracleBatchPriceUpdate() public {
        vm.startPrank(oracle1);
        
        address[] memory assets = new address[](2);
        uint256[] memory prices = new uint256[](2);
        uint256[] memory confidences = new uint256[](2);
        
        assets[0] = asset1;
        assets[1] = asset1; // Same oracle can update same asset multiple times
        prices[0] = 1000;
        prices[1] = 1050;
        confidences[0] = 9500;
        confidences[1] = 9600;
        
        oracleAggregator.batchUpdatePrices(assets, prices, confidences);
        
        // Should have the last update
        (uint256 price, uint256 confidence,) = oracleAggregator.getLatestPrice(asset1);
        assertEq(price, 1050);
        assertEq(confidence, 9600);
        
        vm.stopPrank();
    }

    function testOracleUnauthorizedUpdate() public {
        vm.startPrank(oracle1);
        
        // Try to update asset2 (not authorized)
        vm.expectRevert(OracleAggregator.Unauthorized.selector);
        oracleAggregator.updatePrice(asset2, 2000, 9500);
        
        vm.stopPrank();
    }

    function testOracleInvalidInput() public {
        vm.startPrank(oracle1);
        
        // Test zero price
        vm.expectRevert(OracleAggregator.InvalidInput.selector);
        oracleAggregator.updatePrice(asset1, 0, 9500);
        
        // Test confidence > 10000
        vm.expectRevert(OracleAggregator.InvalidInput.selector);
        oracleAggregator.updatePrice(asset1, 1000, 10001);
        
        // Test zero address asset
        vm.expectRevert(OracleAggregator.InvalidInput.selector);
        oracleAggregator.updatePrice(address(0), 1000, 9500);
        
        vm.stopPrank();
    }

    function testOracleAuthorization() public {
        vm.startPrank(owner);
        
        // Authorize oracle1 for asset2
        oracleAggregator.setOracleAuthorization(oracle1, asset2, true);
        assertTrue(oracleAggregator.isAuthorizedOracle(oracle1, asset2));
        assertEq(oracleAggregator.getActiveOracleCount(asset2), 2);
        
        // Deauthorize oracle1 for asset1
        oracleAggregator.setOracleAuthorization(oracle1, asset1, false);
        assertFalse(oracleAggregator.isAuthorizedOracle(oracle1, asset1));
        assertEq(oracleAggregator.getActiveOracleCount(asset1), 0);
        
        vm.stopPrank();
    }

    function testEmergencyPriceUpdate() public {
        vm.startPrank(owner);
        
        oracleAggregator.emergencyPriceUpdate(asset1, 5000, 8000);
        
        (uint256 price, uint256 confidence,) = oracleAggregator.getLatestPrice(asset1);
        assertEq(price, 5000);
        assertEq(confidence, 8000);
        
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                            INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testIntegrationOracleToDataLogger() public {
        // Oracle updates price
        vm.startPrank(oracle1);
        oracleAggregator.updatePrice(asset1, 1000, 9500);
        vm.stopPrank();
        
        // Check that DataLogger received the oracle update
        assertEq(dataLogger.getTotalEventCount(), 1);
    }

    function testGasOptimization() public {
        vm.startPrank(user1);
        
        // Single action
        uint256 gasBefore = gasleft();
        dataLogger.logPortfolioAction(user2, "buy", asset1, 1000, 100);
        uint256 gasUsedSingle = gasBefore - gasleft();
        
        // Batch actions (should be more efficient per action)
        address[] memory users = new address[](10);
        string[] memory actions = new string[](10);
        address[] memory assets = new address[](10);
        uint256[] memory amounts = new uint256[](10);
        uint256[] memory prices = new uint256[](10);
        
        for (uint256 i = 0; i < 10; i++) {
            users[i] = user2;
            actions[i] = "buy";
            assets[i] = asset1;
            amounts[i] = 1000 + i;
            prices[i] = 100 + i;
        }
        
        gasBefore = gasleft();
        dataLogger.batchLogPortfolioActions(users, actions, assets, amounts, prices);
        uint256 gasUsedBatch = gasBefore - gasleft();
        
        // Batch should be more efficient per action
        assertTrue(gasUsedBatch < gasUsedSingle * 10);
        
        vm.stopPrank();
    }

    function testContractInfo() public {
        (
            uint256 totalEvents,
            address contractOwner,
            bool isPaused,
            uint256 blockNumber,
            uint256 timestamp
        ) = dataLogger.getContractInfo();
        
        assertEq(totalEvents, 0);
        assertEq(contractOwner, owner);
        assertFalse(isPaused);
        assertEq(blockNumber, block.number);
        assertEq(timestamp, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                            FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzzPortfolioAction(
        address user,
        string memory action,
        address asset,
        uint256 amount,
        uint256 price
    ) public {
        vm.assume(user != address(0));
        vm.assume(asset != address(0));
        vm.assume(bytes(action).length > 0);
        vm.assume(amount > 0);
        
        vm.startPrank(user1);
        dataLogger.logPortfolioAction(user, action, asset, amount, price);
        
        assertEq(dataLogger.getTotalEventCount(), 1);
        assertEq(dataLogger.getLastUserActivity(user), block.timestamp);
        
        vm.stopPrank();
    }

    function testFuzzOracleUpdate(
        address asset,
        uint256 price,
        uint256 confidence
    ) public {
        vm.assume(asset != address(0));
        vm.assume(price > 0);
        vm.assume(confidence <= 10000);
        
        // Authorize oracle for the asset
        vm.startPrank(owner);
        oracleAggregator.setOracleAuthorization(oracle1, asset, true);
        vm.stopPrank();
        
        vm.startPrank(oracle1);
        oracleAggregator.updatePrice(asset, price, confidence);
        
        (uint256 returnedPrice, uint256 returnedConfidence,) = oracleAggregator.getLatestPrice(asset);
        assertEq(returnedPrice, price);
        assertEq(returnedConfidence, confidence);
        
        vm.stopPrank();
    }
}