// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IPortfolioManager.sol";

/**
 * @title IAIAgent
 * @dev Interface for the AI agent authority contract
 * @notice Defines the standard functions for AI decision validation and management
 */
interface IAIAgent {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev AI decision record
     * @param decisionId Unique decision identifier
     * @param portfolioManager The portfolio manager address
     * @param targetAllocations The proposed asset allocations
     * @param reasoning IPFS hash of decision reasoning
     * @param confidence Confidence score (0-10000 basis points)
     * @param timestamp Decision timestamp
     * @param executed Whether the decision was executed
     */
    struct AIDecision {
        bytes32 decisionId;
        address portfolioManager;
        IPortfolioManager.AssetAllocation[] targetAllocations;
        bytes32 reasoning;
        uint256 confidence;
        uint256 timestamp;
        bool executed;
    }

    /**
     * @dev Rate limit configuration
     * @param decisionsPerHour Maximum decisions per hour
     * @param maxAllocationChange Maximum allocation change per decision (basis points)
     * @param cooldownPeriod Minimum time between decisions
     */
    struct RateLimitConfig {
        uint256 decisionsPerHour;
        uint256 maxAllocationChange;
        uint256 cooldownPeriod;
    }

    /**
     * @dev Multi-sig upgrade proposal
     * @param proposalId Unique proposal identifier
     * @param newImplementation New implementation address
     * @param proposer The proposer address
     * @param approvals Current approval count
     * @param executed Whether the proposal was executed
     * @param deadline Proposal deadline
     */
    struct UpgradeProposal {
        bytes32 proposalId;
        address newImplementation;
        address proposer;
        uint256 approvals;
        bool executed;
        uint256 deadline;
    }

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event DecisionProposed(
        bytes32 indexed decisionId,
        address indexed portfolioManager,
        uint256 confidence,
        bytes32 reasoning
    );

    event DecisionValidated(
        bytes32 indexed decisionId,
        bool approved,
        string reason
    );

    event DecisionExecuted(
        bytes32 indexed decisionId,
        address indexed executor,
        uint256 gasUsed
    );

    event RateLimitUpdated(
        uint256 decisionsPerHour,
        uint256 maxAllocationChange,
        uint256 cooldownPeriod
    );

    event SignerAdded(
        address indexed signer,
        uint256 totalSigners
    );

    event SignerRemoved(
        address indexed signer,
        uint256 totalSigners
    );

    event UpgradeProposed(
        bytes32 indexed proposalId,
        address indexed proposer,
        address newImplementation
    );

    event UpgradeApproved(
        bytes32 indexed proposalId,
        address indexed approver,
        uint256 approvals
    );

    event UpgradeExecuted(
        bytes32 indexed proposalId,
        address indexed executor,
        address newImplementation
    );

    event EmergencyPause(
        address indexed pauser,
        string reason,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                        DECISION MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Propose a new rebalancing decision
     * @param portfolioManager The portfolio manager to rebalance
     * @param targetAllocations The target asset allocations
     * @param reasoning IPFS hash of decision reasoning
     * @param confidence Confidence score
     * @return decisionId The unique decision identifier
     */
    function proposeDecision(
        address portfolioManager,
        IPortfolioManager.AssetAllocation[] calldata targetAllocations,
        bytes32 reasoning,
        uint256 confidence
    ) external returns (bytes32 decisionId);

    /**
     * @dev Validate a proposed decision
     * @param decisionId The decision to validate
     * @return isValid Whether the decision is valid
     * @return signature The validation signature
     */
    function validateDecision(bytes32 decisionId) 
        external 
        view 
        returns (bool isValid, bytes memory signature);

    /**
     * @dev Execute a validated decision
     * @param decisionId The decision to execute
     */
    function executeDecision(bytes32 decisionId) external;

    /**
     * @dev Get decision details
     * @param decisionId The decision identifier
     * @return decision The decision details
     */
    function getDecision(bytes32 decisionId) 
        external 
        view 
        returns (AIDecision memory decision);

    /**
     * @dev Get decision history for a portfolio
     * @param portfolioManager The portfolio manager address
     * @param offset Starting offset
     * @param limit Number of records to return
     * @return decisions Array of decisions
     */
    function getDecisionHistory(
        address portfolioManager,
        uint256 offset,
        uint256 limit
    ) external view returns (AIDecision[] memory decisions);

    /*//////////////////////////////////////////////////////////////
                        RATE LIMITING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check if a decision can be made
     * @param portfolioManager The portfolio manager address
     * @return canDecide Whether a decision can be made
     * @return reason If not, the reason why
     */
    function canMakeDecision(address portfolioManager) 
        external 
        view 
        returns (bool canDecide, string memory reason);

    /**
     * @dev Get current rate limit configuration
     * @return config The rate limit configuration
     */
    function getRateLimitConfig() 
        external 
        view 
        returns (RateLimitConfig memory config);

    /**
     * @dev Update rate limit configuration
     * @param config New rate limit configuration
     */
    function updateRateLimitConfig(RateLimitConfig calldata config) external;

    /*//////////////////////////////////////////////////////////////
                        MULTI-SIG FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Propose an upgrade
     * @param newImplementation New implementation address
     * @return proposalId The proposal identifier
     */
    function proposeUpgrade(address newImplementation) 
        external 
        returns (bytes32 proposalId);

    /**
     * @dev Approve an upgrade proposal
     * @param proposalId The proposal to approve
     */
    function approveUpgrade(bytes32 proposalId) external;

    /**
     * @dev Execute an approved upgrade
     * @param proposalId The proposal to execute
     */
    function executeUpgrade(bytes32 proposalId) external;

    /**
     * @dev Add a new signer
     * @param signer The signer address to add
     */
    function addSigner(address signer) external;

    /**
     * @dev Remove a signer
     * @param signer The signer address to remove
     */
    function removeSigner(address signer) external;

    /**
     * @dev Get required approvals for upgrades
     * @return required The number of required approvals
     */
    function getRequiredApprovals() external view returns (uint256 required);

    /*//////////////////////////////////////////////////////////////
                        EMERGENCY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Pause all AI operations
     * @param reason The pause reason
     */
    function emergencyPause(string calldata reason) external;

    /**
     * @dev Resume AI operations
     */
    function unpause() external;

    /**
     * @dev Check if operations are paused
     * @return isPaused Whether operations are paused
     */
    function paused() external view returns (bool isPaused);
}