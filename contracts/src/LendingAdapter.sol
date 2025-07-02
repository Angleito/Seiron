// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LendingAdapter
 * @dev Interface adapter for Yei Finance and Aave V3 lending protocols
 * @notice Provides unified interface for lending operations across protocols
 */
contract LendingAdapter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Lending position information
    struct LendingPosition {
        address asset;
        uint256 deposited;
        uint256 borrowed;
        uint256 collateralValue;
        uint256 borrowValue;
        uint256 healthFactor;
        uint256 apy;
        uint256 borrowRate;
    }

    /// @dev Protocol information
    struct Protocol {
        address lendingPool;
        address dataProvider;
        bool isActive;
        string name;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @dev Mapping of protocol ID to protocol info
    mapping(uint256 => Protocol) public protocols;

    /// @dev Mapping of user to protocol to asset to position
    mapping(address => mapping(uint256 => mapping(address => LendingPosition))) public positions;

    /// @dev Aave V3 protocol ID
    uint256 public constant AAVE_V3 = 1;

    /// @dev Yei Finance protocol ID
    uint256 public constant YEI_FINANCE = 2;

    /// @dev Portfolio vault address
    address public portfolioVault;

    /// @dev Emergency withdrawal enabled
    bool public emergencyWithdrawEnabled;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposited(
        address indexed user,
        uint256 indexed protocol,
        address indexed asset,
        uint256 amount
    );

    event Withdrawn(
        address indexed user,
        uint256 indexed protocol,
        address indexed asset,
        uint256 amount
    );

    event Borrowed(
        address indexed user,
        uint256 indexed protocol,
        address indexed asset,
        uint256 amount
    );

    event Repaid(
        address indexed user,
        uint256 indexed protocol,
        address indexed asset,
        uint256 amount
    );

    event ProtocolAdded(
        uint256 indexed protocolId,
        address lendingPool,
        string name
    );

    event ProtocolUpdated(
        uint256 indexed protocolId,
        address lendingPool,
        bool isActive
    );

    event EmergencyWithdrawEnabled(bool enabled);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner, address _portfolioVault) {
        require(_owner != address(0), "Invalid owner");
        require(_portfolioVault != address(0), "Invalid vault");
        
        _transferOwnership(_owner);
        portfolioVault = _portfolioVault;
    }

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyPortfolioVault() {
        require(msg.sender == portfolioVault, "Only portfolio vault");
        _;
    }

    modifier protocolActive(uint256 protocolId) {
        require(protocols[protocolId].isActive, "Protocol not active");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            LENDING OPERATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Deposit assets into lending protocol
     * @param protocolId The protocol to deposit into
     * @param asset The asset to deposit
     * @param amount The amount to deposit
     * @param onBehalfOf The address to deposit for
     */
    function deposit(
        uint256 protocolId,
        address asset,
        uint256 amount,
        address onBehalfOf
    ) 
        external 
        onlyPortfolioVault
        protocolActive(protocolId)
        nonReentrant 
    {
        require(amount > 0, "Invalid amount");
        require(asset != address(0), "Invalid asset");
        require(onBehalfOf != address(0), "Invalid recipient");

        Protocol memory protocol = protocols[protocolId];
        
        // Transfer tokens to this contract
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve lending pool
        IERC20(asset).safeApprove(protocol.lendingPool, amount);
        
        // Execute deposit based on protocol
        if (protocolId == AAVE_V3) {
            _depositAaveV3(protocol.lendingPool, asset, amount, onBehalfOf);
        } else if (protocolId == YEI_FINANCE) {
            _depositYeiFinance(protocol.lendingPool, asset, amount, onBehalfOf);
        } else {
            revert("Unknown protocol");
        }

        // Update position
        positions[onBehalfOf][protocolId][asset].deposited += amount;

        emit Deposited(onBehalfOf, protocolId, asset, amount);
    }

    /**
     * @dev Withdraw assets from lending protocol
     * @param protocolId The protocol to withdraw from
     * @param asset The asset to withdraw
     * @param amount The amount to withdraw
     * @param to The address to withdraw to
     */
    function withdraw(
        uint256 protocolId,
        address asset,
        uint256 amount,
        address to
    ) 
        external 
        onlyPortfolioVault
        protocolActive(protocolId)
        nonReentrant 
        returns (uint256 withdrawn)
    {
        require(amount > 0, "Invalid amount");
        require(asset != address(0), "Invalid asset");
        require(to != address(0), "Invalid recipient");

        Protocol memory protocol = protocols[protocolId];
        
        // Execute withdrawal based on protocol
        if (protocolId == AAVE_V3) {
            withdrawn = _withdrawAaveV3(protocol.lendingPool, asset, amount, to);
        } else if (protocolId == YEI_FINANCE) {
            withdrawn = _withdrawYeiFinance(protocol.lendingPool, asset, amount, to);
        } else {
            revert("Unknown protocol");
        }

        // Update position
        positions[msg.sender][protocolId][asset].deposited -= withdrawn;

        emit Withdrawn(msg.sender, protocolId, asset, withdrawn);
    }

    /**
     * @dev Borrow assets from lending protocol
     * @param protocolId The protocol to borrow from
     * @param asset The asset to borrow
     * @param amount The amount to borrow
     * @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
     * @param onBehalfOf The address to borrow for
     */
    function borrow(
        uint256 protocolId,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) 
        external 
        onlyPortfolioVault
        protocolActive(protocolId)
        nonReentrant 
    {
        require(amount > 0, "Invalid amount");
        require(asset != address(0), "Invalid asset");
        require(onBehalfOf != address(0), "Invalid borrower");
        require(interestRateMode == 1 || interestRateMode == 2, "Invalid rate mode");

        Protocol memory protocol = protocols[protocolId];
        
        // Execute borrow based on protocol
        if (protocolId == AAVE_V3) {
            _borrowAaveV3(protocol.lendingPool, asset, amount, interestRateMode, onBehalfOf);
        } else if (protocolId == YEI_FINANCE) {
            _borrowYeiFinance(protocol.lendingPool, asset, amount, onBehalfOf);
        } else {
            revert("Unknown protocol");
        }

        // Update position
        positions[onBehalfOf][protocolId][asset].borrowed += amount;

        emit Borrowed(onBehalfOf, protocolId, asset, amount);
    }

    /**
     * @dev Repay borrowed assets
     * @param protocolId The protocol to repay to
     * @param asset The asset to repay
     * @param amount The amount to repay
     * @param interestRateMode The interest rate mode
     * @param onBehalfOf The address to repay for
     */
    function repay(
        uint256 protocolId,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) 
        external 
        onlyPortfolioVault
        protocolActive(protocolId)
        nonReentrant 
        returns (uint256 repaid)
    {
        require(amount > 0, "Invalid amount");
        require(asset != address(0), "Invalid asset");
        require(onBehalfOf != address(0), "Invalid borrower");

        Protocol memory protocol = protocols[protocolId];
        
        // Transfer tokens to this contract
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve lending pool
        IERC20(asset).safeApprove(protocol.lendingPool, amount);
        
        // Execute repay based on protocol
        if (protocolId == AAVE_V3) {
            repaid = _repayAaveV3(protocol.lendingPool, asset, amount, interestRateMode, onBehalfOf);
        } else if (protocolId == YEI_FINANCE) {
            repaid = _repayYeiFinance(protocol.lendingPool, asset, amount, onBehalfOf);
        } else {
            revert("Unknown protocol");
        }

        // Update position
        positions[onBehalfOf][protocolId][asset].borrowed -= repaid;

        emit Repaid(onBehalfOf, protocolId, asset, repaid);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get user position in a protocol
     * @param user The user address
     * @param protocolId The protocol ID
     * @param asset The asset address
     * @return position The lending position
     */
    function getPosition(
        address user,
        uint256 protocolId,
        address asset
    ) 
        external 
        view 
        returns (LendingPosition memory position) 
    {
        position = positions[user][protocolId][asset];
        
        // Fetch real-time data from protocol
        if (protocols[protocolId].isActive) {
            // Update with real-time data
            // This would call the protocol's data provider
        }
    }

    /**
     * @dev Get user's total position value across all protocols
     * @param user The user address
     * @return totalDeposited Total deposited value
     * @return totalBorrowed Total borrowed value
     * @return netValue Net position value
     */
    function getTotalPosition(address user) 
        external 
        view 
        returns (
            uint256 totalDeposited,
            uint256 totalBorrowed,
            uint256 netValue
        ) 
    {
        // Aggregate across all protocols and assets
        // This is simplified - would need oracle prices
    }

    /**
     * @dev Check if user can borrow
     * @param user The user address
     * @param protocolId The protocol ID
     * @param asset The asset to borrow
     * @param amount The amount to borrow
     * @return canBorrow Whether user can borrow
     * @return reason Reason if cannot borrow
     */
    function canBorrow(
        address user,
        uint256 protocolId,
        address asset,
        uint256 amount
    ) 
        external 
        view 
        returns (bool canBorrow, string memory reason) 
    {
        // Check health factor and collateral
        // This would integrate with protocol's risk parameters
        canBorrow = true;
        reason = "";
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Add new lending protocol
     * @param protocolId The protocol ID
     * @param lendingPool The lending pool address
     * @param dataProvider The data provider address
     * @param name The protocol name
     */
    function addProtocol(
        uint256 protocolId,
        address lendingPool,
        address dataProvider,
        string memory name
    ) 
        external 
        onlyOwner 
    {
        require(lendingPool != address(0), "Invalid lending pool");
        require(protocols[protocolId].lendingPool == address(0), "Protocol exists");
        
        protocols[protocolId] = Protocol({
            lendingPool: lendingPool,
            dataProvider: dataProvider,
            isActive: true,
            name: name
        });

        emit ProtocolAdded(protocolId, lendingPool, name);
    }

    /**
     * @dev Update protocol status
     * @param protocolId The protocol ID
     * @param isActive Whether protocol is active
     */
    function setProtocolStatus(uint256 protocolId, bool isActive) 
        external 
        onlyOwner 
    {
        require(protocols[protocolId].lendingPool != address(0), "Protocol not found");
        protocols[protocolId].isActive = isActive;
        
        emit ProtocolUpdated(protocolId, protocols[protocolId].lendingPool, isActive);
    }

    /**
     * @dev Update portfolio vault address
     * @param newVault The new vault address
     */
    function setPortfolioVault(address newVault) external onlyOwner {
        require(newVault != address(0), "Invalid vault");
        portfolioVault = newVault;
    }

    /**
     * @dev Enable/disable emergency withdrawals
     * @param enabled Whether to enable emergency withdrawals
     */
    function setEmergencyWithdraw(bool enabled) external onlyOwner {
        emergencyWithdrawEnabled = enabled;
        emit EmergencyWithdrawEnabled(enabled);
    }

    /**
     * @dev Emergency withdraw for users
     * @param protocolId The protocol ID
     * @param asset The asset to withdraw
     */
    function emergencyWithdraw(uint256 protocolId, address asset) 
        external 
        nonReentrant 
    {
        require(emergencyWithdrawEnabled, "Emergency withdraw disabled");
        
        LendingPosition storage position = positions[msg.sender][protocolId][asset];
        uint256 amount = position.deposited;
        require(amount > 0, "No position");

        // Attempt withdrawal
        Protocol memory protocol = protocols[protocolId];
        uint256 withdrawn;
        
        if (protocolId == AAVE_V3) {
            withdrawn = _withdrawAaveV3(protocol.lendingPool, asset, amount, msg.sender);
        } else if (protocolId == YEI_FINANCE) {
            withdrawn = _withdrawYeiFinance(protocol.lendingPool, asset, amount, msg.sender);
        }

        position.deposited -= withdrawn;
        emit Withdrawn(msg.sender, protocolId, asset, withdrawn);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Internal function to deposit to Aave V3
     */
    function _depositAaveV3(
        address lendingPool,
        address asset,
        uint256 amount,
        address onBehalfOf
    ) internal {
        // Aave V3 deposit implementation
        // IPool(lendingPool).supply(asset, amount, onBehalfOf, 0);
    }

    /**
     * @dev Internal function to withdraw from Aave V3
     */
    function _withdrawAaveV3(
        address lendingPool,
        address asset,
        uint256 amount,
        address to
    ) internal returns (uint256) {
        // Aave V3 withdraw implementation
        // return IPool(lendingPool).withdraw(asset, amount, to);
        return amount; // Placeholder
    }

    /**
     * @dev Internal function to borrow from Aave V3
     */
    function _borrowAaveV3(
        address lendingPool,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) internal {
        // Aave V3 borrow implementation
        // IPool(lendingPool).borrow(asset, amount, interestRateMode, 0, onBehalfOf);
    }

    /**
     * @dev Internal function to repay Aave V3
     */
    function _repayAaveV3(
        address lendingPool,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) internal returns (uint256) {
        // Aave V3 repay implementation
        // return IPool(lendingPool).repay(asset, amount, interestRateMode, onBehalfOf);
        return amount; // Placeholder
    }

    /**
     * @dev Internal function to deposit to Yei Finance
     */
    function _depositYeiFinance(
        address lendingPool,
        address asset,
        uint256 amount,
        address onBehalfOf
    ) internal {
        // Yei Finance deposit implementation
    }

    /**
     * @dev Internal function to withdraw from Yei Finance
     */
    function _withdrawYeiFinance(
        address lendingPool,
        address asset,
        uint256 amount,
        address to
    ) internal returns (uint256) {
        // Yei Finance withdraw implementation
        return amount; // Placeholder
    }

    /**
     * @dev Internal function to borrow from Yei Finance
     */
    function _borrowYeiFinance(
        address lendingPool,
        address asset,
        uint256 amount,
        address onBehalfOf
    ) internal {
        // Yei Finance borrow implementation
    }

    /**
     * @dev Internal function to repay Yei Finance
     */
    function _repayYeiFinance(
        address lendingPool,
        address asset,
        uint256 amount,
        address onBehalfOf
    ) internal returns (uint256) {
        // Yei Finance repay implementation
        return amount; // Placeholder
    }
}