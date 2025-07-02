// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./interfaces/IPortfolioManager.sol";

/**
 * @title AIExecutor
 * @dev Execute AI-approved operations with signature verification and rate limiting
 * @notice Manages execution of AI decisions with security controls
 */
contract AIExecutor is Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Operation types
    enum OperationType {
        REBALANCE,
        TRADE,
        LENDING_DEPOSIT,
        LENDING_WITHDRAW,
        LENDING_BORROW,
        LENDING_REPAY,
        EMERGENCY_ACTION
    }

    /// @dev Operation data structure
    struct Operation {
        uint256 nonce;
        address user;
        OperationType opType;
        bytes data;
        uint256 deadline;
        uint256 gasLimit;
    }

    /// @dev Operation history entry
    struct OperationHistory {
        bytes32 operationHash;
        uint256 timestamp;
        bool executed;
        bool success;
        string reason;
    }

    /// @dev Rate limit configuration
    struct RateLimit {
        uint256 operationsPerHour;
        uint256 operationsPerDay;
        uint256 maxValuePerOperation;
        uint256 maxValuePerDay;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @dev AI signer address
    address public aiSigner;

    /// @dev Portfolio vault address
    address public portfolioVault;

    /// @dev Lending adapter address
    address public lendingAdapter;

    /// @dev Operation nonces for replay protection
    mapping(address => uint256) public nonces;

    /// @dev Operation history
    mapping(bytes32 => OperationHistory) public operationHistory;

    /// @dev User operation history
    mapping(address => bytes32[]) public userOperations;

    /// @dev Rate limiting per user
    mapping(address => RateLimit) public userRateLimits;

    /// @dev Operations count per user per time window
    mapping(address => mapping(uint256 => uint256)) public operationCounts;

    /// @dev Value transferred per user per time window
    mapping(address => mapping(uint256 => uint256)) public valueTransferred;

    /// @dev Default rate limits
    RateLimit public defaultRateLimit;

    /// @dev Emergency pause per operation type
    mapping(OperationType => bool) public operationPaused;

    /// @dev Whitelisted users (no rate limits)
    mapping(address => bool) public whitelisted;

    /// @dev Domain separator for EIP-712
    bytes32 private constant OPERATION_TYPEHASH = keccak256(
        "Operation(uint256 nonce,address user,uint8 opType,bytes data,uint256 deadline,uint256 gasLimit)"
    );

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OperationExecuted(
        bytes32 indexed operationHash,
        address indexed user,
        OperationType indexed opType,
        bool success,
        string reason
    );

    event AISignerUpdated(address indexed oldSigner, address indexed newSigner);

    event RateLimitUpdated(address indexed user, RateLimit newLimit);

    event OperationPaused(OperationType indexed opType, bool paused);

    event UserWhitelisted(address indexed user, bool whitelisted);

    event NonceIncremented(address indexed user, uint256 newNonce);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _owner,
        address _aiSigner,
        address _portfolioVault,
        address _lendingAdapter
    ) EIP712("AIExecutor", "1") {
        require(_owner != address(0), "Invalid owner");
        require(_aiSigner != address(0), "Invalid AI signer");
        require(_portfolioVault != address(0), "Invalid portfolio vault");
        require(_lendingAdapter != address(0), "Invalid lending adapter");

        _transferOwnership(_owner);
        aiSigner = _aiSigner;
        portfolioVault = _portfolioVault;
        lendingAdapter = _lendingAdapter;

        // Set default rate limits
        defaultRateLimit = RateLimit({
            operationsPerHour: 10,
            operationsPerDay: 50,
            maxValuePerOperation: 10000 * 1e18, // 10k USD
            maxValuePerDay: 100000 * 1e18 // 100k USD
        });
    }

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier operationNotPaused(OperationType opType) {
        require(!operationPaused[opType], "Operation type paused");
        _;
    }

    modifier withinDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Operation expired");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            MAIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Execute an AI-approved operation
     * @param operation The operation to execute
     * @param signature The AI signature
     * @return success Whether the operation succeeded
     * @return result The operation result data
     */
    function executeOperation(
        Operation calldata operation,
        bytes calldata signature
    ) 
        external 
        nonReentrant
        operationNotPaused(operation.opType)
        withinDeadline(operation.deadline)
        returns (bool success, bytes memory result) 
    {
        // Verify operation caller
        require(operation.user == msg.sender, "Invalid caller");
        
        // Verify nonce
        require(operation.nonce == nonces[msg.sender], "Invalid nonce");
        
        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            OPERATION_TYPEHASH,
            operation.nonce,
            operation.user,
            operation.opType,
            keccak256(operation.data),
            operation.deadline,
            operation.gasLimit
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == aiSigner, "Invalid AI signature");
        
        // Check rate limits
        if (!whitelisted[msg.sender]) {
            _checkRateLimits(msg.sender, operation);
        }
        
        // Increment nonce
        nonces[msg.sender]++;
        
        // Execute operation
        bytes32 operationHash = keccak256(abi.encode(operation));
        
        try this._executeOperationInternal{gas: operation.gasLimit}(operation) returns (bytes memory _result) {
            success = true;
            result = _result;
            
            // Record successful operation
            operationHistory[operationHash] = OperationHistory({
                operationHash: operationHash,
                timestamp: block.timestamp,
                executed: true,
                success: true,
                reason: "Success"
            });
        } catch Error(string memory reason) {
            success = false;
            result = bytes(reason);
            
            // Record failed operation
            operationHistory[operationHash] = OperationHistory({
                operationHash: operationHash,
                timestamp: block.timestamp,
                executed: true,
                success: false,
                reason: reason
            });
        } catch (bytes memory lowLevelData) {
            success = false;
            result = lowLevelData;
            
            // Record failed operation
            operationHistory[operationHash] = OperationHistory({
                operationHash: operationHash,
                timestamp: block.timestamp,
                executed: true,
                success: false,
                reason: "Low-level error"
            });
        }
        
        // Record operation for user
        userOperations[msg.sender].push(operationHash);
        
        // Update rate limit counters
        if (!whitelisted[msg.sender]) {
            _updateRateLimitCounters(msg.sender, operation);
        }
        
        emit OperationExecuted(operationHash, msg.sender, operation.opType, success, string(result));
        emit NonceIncremented(msg.sender, nonces[msg.sender]);
    }

    /**
     * @dev Internal function to execute operation
     * @param operation The operation to execute
     * @return result The operation result
     */
    function _executeOperationInternal(Operation calldata operation) 
        external 
        returns (bytes memory result) 
    {
        require(msg.sender == address(this), "Internal only");
        
        if (operation.opType == OperationType.REBALANCE) {
            result = _executeRebalance(operation.user, operation.data);
        } else if (operation.opType == OperationType.TRADE) {
            result = _executeTrade(operation.user, operation.data);
        } else if (operation.opType == OperationType.LENDING_DEPOSIT) {
            result = _executeLendingDeposit(operation.user, operation.data);
        } else if (operation.opType == OperationType.LENDING_WITHDRAW) {
            result = _executeLendingWithdraw(operation.user, operation.data);
        } else if (operation.opType == OperationType.LENDING_BORROW) {
            result = _executeLendingBorrow(operation.user, operation.data);
        } else if (operation.opType == OperationType.LENDING_REPAY) {
            result = _executeLendingRepay(operation.user, operation.data);
        } else if (operation.opType == OperationType.EMERGENCY_ACTION) {
            result = _executeEmergencyAction(operation.user, operation.data);
        } else {
            revert("Unknown operation type");
        }
    }

    /*//////////////////////////////////////////////////////////////
                          EXECUTION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Execute portfolio rebalance
     */
    function _executeRebalance(address user, bytes memory data) 
        internal 
        returns (bytes memory) 
    {
        (IPortfolioManager.AssetAllocation[] memory allocations, bytes memory aiSignature) = 
            abi.decode(data, (IPortfolioManager.AssetAllocation[], bytes));
        
        IPortfolioManager(portfolioVault).rebalance(allocations, aiSignature);
        
        return abi.encode(true);
    }

    /**
     * @dev Execute trade
     */
    function _executeTrade(address user, bytes memory data) 
        internal 
        returns (bytes memory) 
    {
        IPortfolioManager.TradeParams memory params = 
            abi.decode(data, (IPortfolioManager.TradeParams));
        
        uint256 amountOut = IPortfolioManager(portfolioVault).executeTrade(params);
        
        return abi.encode(amountOut);
    }

    /**
     * @dev Execute lending deposit
     */
    function _executeLendingDeposit(address user, bytes memory data) 
        internal 
        returns (bytes memory) 
    {
        (uint256 protocolId, address asset, uint256 amount) = 
            abi.decode(data, (uint256, address, uint256));
        
        // Call lending adapter
        (bool success, bytes memory result) = lendingAdapter.call(
            abi.encodeWithSignature(
                "deposit(uint256,address,uint256,address)",
                protocolId,
                asset,
                amount,
                user
            )
        );
        
        require(success, "Lending deposit failed");
        return result;
    }

    /**
     * @dev Execute lending withdraw
     */
    function _executeLendingWithdraw(address user, bytes memory data) 
        internal 
        returns (bytes memory) 
    {
        (uint256 protocolId, address asset, uint256 amount) = 
            abi.decode(data, (uint256, address, uint256));
        
        // Call lending adapter
        (bool success, bytes memory result) = lendingAdapter.call(
            abi.encodeWithSignature(
                "withdraw(uint256,address,uint256,address)",
                protocolId,
                asset,
                amount,
                user
            )
        );
        
        require(success, "Lending withdraw failed");
        return result;
    }

    /**
     * @dev Execute lending borrow
     */
    function _executeLendingBorrow(address user, bytes memory data) 
        internal 
        returns (bytes memory) 
    {
        (uint256 protocolId, address asset, uint256 amount, uint256 interestRateMode) = 
            abi.decode(data, (uint256, address, uint256, uint256));
        
        // Call lending adapter
        (bool success, bytes memory result) = lendingAdapter.call(
            abi.encodeWithSignature(
                "borrow(uint256,address,uint256,uint256,address)",
                protocolId,
                asset,
                amount,
                interestRateMode,
                user
            )
        );
        
        require(success, "Lending borrow failed");
        return result;
    }

    /**
     * @dev Execute lending repay
     */
    function _executeLendingRepay(address user, bytes memory data) 
        internal 
        returns (bytes memory) 
    {
        (uint256 protocolId, address asset, uint256 amount, uint256 interestRateMode) = 
            abi.decode(data, (uint256, address, uint256, uint256));
        
        // Call lending adapter
        (bool success, bytes memory result) = lendingAdapter.call(
            abi.encodeWithSignature(
                "repay(uint256,address,uint256,uint256,address)",
                protocolId,
                asset,
                amount,
                interestRateMode,
                user
            )
        );
        
        require(success, "Lending repay failed");
        return result;
    }

    /**
     * @dev Execute emergency action
     */
    function _executeEmergencyAction(address user, bytes memory data) 
        internal 
        returns (bytes memory) 
    {
        string memory reason = abi.decode(data, (string));
        
        IPortfolioManager(portfolioVault).emergencyWithdraw(reason);
        
        return abi.encode(true);
    }

    /*//////////////////////////////////////////////////////////////
                          RATE LIMITING
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check rate limits for user
     */
    function _checkRateLimits(address user, Operation calldata operation) internal view {
        RateLimit memory limit = userRateLimits[user].operationsPerHour > 0 
            ? userRateLimits[user] 
            : defaultRateLimit;
        
        // Check hourly operation limit
        uint256 hourKey = block.timestamp / 1 hours;
        require(
            operationCounts[user][hourKey] < limit.operationsPerHour,
            "Hourly operation limit exceeded"
        );
        
        // Check daily operation limit
        uint256 dayKey = block.timestamp / 1 days;
        require(
            operationCounts[user][dayKey] < limit.operationsPerDay,
            "Daily operation limit exceeded"
        );
        
        // Check value limits for relevant operations
        if (operation.opType == OperationType.TRADE || 
            operation.opType == OperationType.LENDING_DEPOSIT ||
            operation.opType == OperationType.LENDING_WITHDRAW) {
            
            // Extract value from operation data
            uint256 value = _extractOperationValue(operation);
            
            require(value <= limit.maxValuePerOperation, "Operation value too high");
            require(
                valueTransferred[user][dayKey] + value <= limit.maxValuePerDay,
                "Daily value limit exceeded"
            );
        }
    }

    /**
     * @dev Update rate limit counters
     */
    function _updateRateLimitCounters(address user, Operation calldata operation) internal {
        uint256 hourKey = block.timestamp / 1 hours;
        uint256 dayKey = block.timestamp / 1 days;
        
        operationCounts[user][hourKey]++;
        operationCounts[user][dayKey]++;
        
        // Update value counters for relevant operations
        if (operation.opType == OperationType.TRADE || 
            operation.opType == OperationType.LENDING_DEPOSIT ||
            operation.opType == OperationType.LENDING_WITHDRAW) {
            
            uint256 value = _extractOperationValue(operation);
            valueTransferred[user][dayKey] += value;
        }
    }

    /**
     * @dev Extract value from operation data
     */
    function _extractOperationValue(Operation calldata operation) internal pure returns (uint256) {
        if (operation.opType == OperationType.TRADE) {
            IPortfolioManager.TradeParams memory params = 
                abi.decode(operation.data, (IPortfolioManager.TradeParams));
            return params.amount;
        } else if (operation.opType == OperationType.LENDING_DEPOSIT || 
                   operation.opType == OperationType.LENDING_WITHDRAW) {
            (, , uint256 amount) = abi.decode(operation.data, (uint256, address, uint256));
            return amount;
        }
        return 0;
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get user operation history
     * @param user The user address
     * @param offset The offset to start from
     * @param limit The number of operations to return
     * @return operations Array of operation hashes
     * @return histories Array of operation histories
     */
    function getUserOperationHistory(
        address user,
        uint256 offset,
        uint256 limit
    ) 
        external 
        view 
        returns (
            bytes32[] memory operations,
            OperationHistory[] memory histories
        ) 
    {
        uint256 total = userOperations[user].length;
        if (offset >= total) {
            return (new bytes32[](0), new OperationHistory[](0));
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 length = end - offset;
        operations = new bytes32[](length);
        histories = new OperationHistory[](length);
        
        for (uint256 i = 0; i < length; i++) {
            bytes32 opHash = userOperations[user][offset + i];
            operations[i] = opHash;
            histories[i] = operationHistory[opHash];
        }
    }

    /**
     * @dev Get current rate limit status for user
     * @param user The user address
     * @return hourlyOps Current hourly operations count
     * @return dailyOps Current daily operations count
     * @return dailyValue Current daily value transferred
     * @return limits User's rate limits
     */
    function getRateLimitStatus(address user) 
        external 
        view 
        returns (
            uint256 hourlyOps,
            uint256 dailyOps,
            uint256 dailyValue,
            RateLimit memory limits
        ) 
    {
        uint256 hourKey = block.timestamp / 1 hours;
        uint256 dayKey = block.timestamp / 1 days;
        
        hourlyOps = operationCounts[user][hourKey];
        dailyOps = operationCounts[user][dayKey];
        dailyValue = valueTransferred[user][dayKey];
        
        limits = userRateLimits[user].operationsPerHour > 0 
            ? userRateLimits[user] 
            : defaultRateLimit;
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Update AI signer address
     * @param newSigner The new AI signer address
     */
    function setAISigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer");
        address oldSigner = aiSigner;
        aiSigner = newSigner;
        emit AISignerUpdated(oldSigner, newSigner);
    }

    /**
     * @dev Set user rate limits
     * @param user The user address
     * @param limit The new rate limit
     */
    function setUserRateLimit(address user, RateLimit calldata limit) external onlyOwner {
        userRateLimits[user] = limit;
        emit RateLimitUpdated(user, limit);
    }

    /**
     * @dev Set default rate limits
     * @param limit The new default rate limit
     */
    function setDefaultRateLimit(RateLimit calldata limit) external onlyOwner {
        defaultRateLimit = limit;
        emit RateLimitUpdated(address(0), limit);
    }

    /**
     * @dev Pause/unpause operation type
     * @param opType The operation type
     * @param paused Whether to pause
     */
    function setOperationPaused(OperationType opType, bool paused) external onlyOwner {
        operationPaused[opType] = paused;
        emit OperationPaused(opType, paused);
    }

    /**
     * @dev Whitelist/unwhitelist user
     * @param user The user address
     * @param _whitelisted Whether to whitelist
     */
    function setWhitelisted(address user, bool _whitelisted) external onlyOwner {
        whitelisted[user] = _whitelisted;
        emit UserWhitelisted(user, _whitelisted);
    }

    /**
     * @dev Update contract addresses
     * @param _portfolioVault The portfolio vault address
     * @param _lendingAdapter The lending adapter address
     */
    function updateContracts(
        address _portfolioVault,
        address _lendingAdapter
    ) external onlyOwner {
        require(_portfolioVault != address(0), "Invalid vault");
        require(_lendingAdapter != address(0), "Invalid adapter");
        
        portfolioVault = _portfolioVault;
        lendingAdapter = _lendingAdapter;
    }

    /**
     * @dev Increment nonce manually (for failed operations)
     * @param user The user address
     */
    function incrementNonce(address user) external onlyOwner {
        nonces[user]++;
        emit NonceIncremented(user, nonces[user]);
    }
}