// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentRegistry.sol";

/**
 * @title PaymentLedger
 * @notice Logs every x402 micropayment made by AI agents purchasing blockchain intelligence data.
 * @dev Integrates with AgentRegistry to enforce daily budgets before recording payments.
 */
contract PaymentLedger {
    struct Payment {
        address agent;
        string dataSource;
        uint256 amount;
        bytes32 dataHash;
        uint256 timestamp;
        string queryType;
    }

    Payment[] public payments;

    mapping(address => uint256) public totalSpentByAgent;
    mapping(address => uint256) public paymentCountByAgent;
    mapping(address => mapping(string => uint256)) public spentBySourceByAgent;

    AgentRegistry public agentRegistry;

    event PaymentLogged(
        address indexed agent,
        string dataSource,
        uint256 amount,
        bytes32 dataHash,
        uint256 timestamp,
        string queryType
    );

    /**
     * @notice Deploys the PaymentLedger linked to an AgentRegistry.
     * @param _agentRegistry Address of the deployed AgentRegistry contract.
     */
    constructor(address _agentRegistry) {
        require(_agentRegistry != address(0), "PaymentLedger: zero address");
        agentRegistry = AgentRegistry(_agentRegistry);
    }

    /**
     * @notice Logs a micropayment for the calling agent.
     * @dev Checks budget via AgentRegistry.canSpend(), then records the spend.
     * @param dataSource Name or identifier of the data provider (e.g., "dune_analytics", "chainlink").
     * @param amount Amount paid in wei for this data query.
     * @param dataHash Keccak256 hash of the received data for integrity verification.
     * @param queryType Category of the query (e.g., "price_feed", "whale_alert", "contract_analysis").
     */
    function logPayment(
        string calldata dataSource,
        uint256 amount,
        bytes32 dataHash,
        string calldata queryType
    ) external {
        require(bytes(dataSource).length > 0, "PaymentLedger: empty dataSource");
        require(amount > 0, "PaymentLedger: zero amount");
        require(bytes(queryType).length > 0, "PaymentLedger: empty queryType");

        // Verify agent can spend this amount within their daily budget
        require(
            agentRegistry.canSpend(msg.sender, amount),
            "PaymentLedger: agent cannot spend (not registered, inactive, or exceeds budget)"
        );

        // Record the spend in the registry (updates daily spend tracking)
        agentRegistry.recordSpend(msg.sender, amount);

        // Log the payment
        Payment memory payment = Payment({
            agent: msg.sender,
            dataSource: dataSource,
            amount: amount,
            dataHash: dataHash,
            timestamp: block.timestamp,
            queryType: queryType
        });

        payments.push(payment);

        totalSpentByAgent[msg.sender] += amount;
        paymentCountByAgent[msg.sender] += 1;
        spentBySourceByAgent[msg.sender][dataSource] += amount;

        emit PaymentLogged(
            msg.sender,
            dataSource,
            amount,
            dataHash,
            block.timestamp,
            queryType
        );
    }

    /**
     * @notice Returns the total number of payments logged.
     * @return Total payment count.
     */
    function getPaymentCount() external view returns (uint256) {
        return payments.length;
    }

    /**
     * @notice Returns all payments made by a specific agent.
     * @param agent Address of the agent.
     * @return Array of Payment structs.
     */
    function getPaymentsByAgent(address agent) external view returns (Payment[] memory) {
        uint256 count = paymentCountByAgent[agent];
        Payment[] memory agentPayments = new Payment[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < payments.length; i++) {
            if (payments[i].agent == agent) {
                agentPayments[index] = payments[i];
                index++;
                if (index == count) break;
            }
        }

        return agentPayments;
    }

    /**
     * @notice Returns the most recent payments, up to `count`.
     * @param count Maximum number of recent payments to return.
     * @return Array of Payment structs (most recent last in the returned array).
     */
    function getRecentPayments(uint256 count) external view returns (Payment[] memory) {
        uint256 total = payments.length;
        if (count > total) count = total;

        Payment[] memory recent = new Payment[](count);
        uint256 startIndex = total - count;

        for (uint256 i = 0; i < count; i++) {
            recent[i] = payments[startIndex + i];
        }

        return recent;
    }

    /**
     * @notice Returns aggregated stats for a specific agent.
     * @param agent Address of the agent.
     * @return totalSpent Total amount spent by the agent across all time.
     * @return count Total number of payments made.
     * @return firstPayment Timestamp of the agent's first payment (0 if none).
     * @return lastPayment Timestamp of the agent's most recent payment (0 if none).
     */
    function getAgentStats(address agent)
        external
        view
        returns (
            uint256 totalSpent,
            uint256 count,
            uint256 firstPayment,
            uint256 lastPayment
        )
    {
        totalSpent = totalSpentByAgent[agent];
        count = paymentCountByAgent[agent];

        if (count == 0) {
            return (0, 0, 0, 0);
        }

        // Find first and last payment timestamps
        bool foundFirst = false;
        for (uint256 i = 0; i < payments.length; i++) {
            if (payments[i].agent == agent) {
                if (!foundFirst) {
                    firstPayment = payments[i].timestamp;
                    foundFirst = true;
                }
                lastPayment = payments[i].timestamp;
            }
        }
    }
}
