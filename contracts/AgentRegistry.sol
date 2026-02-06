// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice Registers AI agents and manages their daily spending budgets for PayMind x402 micropayments.
 * @dev Each agent has a daily budget that auto-resets based on block.timestamp / 1 days.
 *      Only the linked PaymentLedger contract can call recordSpend().
 */
contract AgentRegistry {
    struct Agent {
        address wallet;
        string name;
        uint256 dailyBudget;
        uint256 spentToday;
        uint256 lastResetDay;
        bool active;
        uint256 registeredAt;
    }

    mapping(address => Agent) public agents;
    address[] public agentList;

    address public paymentLedger;
    address public owner;

    event AgentRegistered(address indexed wallet, string name, uint256 dailyBudget);
    event AgentDeactivated(address indexed wallet);
    event BudgetUpdated(address indexed wallet, uint256 newBudget);
    event PaymentLedgerSet(address indexed ledger);

    modifier onlyOwner() {
        require(msg.sender == owner, "AgentRegistry: caller is not owner");
        _;
    }

    modifier onlyPaymentLedger() {
        require(msg.sender == paymentLedger, "AgentRegistry: caller is not PaymentLedger");
        _;
    }

    modifier onlyRegistered() {
        require(agents[msg.sender].wallet != address(0), "AgentRegistry: agent not registered");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Sets the PaymentLedger contract address that is authorized to call recordSpend.
     * @param _paymentLedger Address of the deployed PaymentLedger contract.
     */
    function setPaymentLedger(address _paymentLedger) external onlyOwner {
        require(_paymentLedger != address(0), "AgentRegistry: zero address");
        paymentLedger = _paymentLedger;
        emit PaymentLedgerSet(_paymentLedger);
    }

    /**
     * @notice Registers the caller as an AI agent with a name and daily budget.
     * @param name Human-readable name for the agent.
     * @param dailyBudget Maximum amount (in wei) the agent can spend per day.
     */
    function registerAgent(string calldata name, uint256 dailyBudget) external {
        require(agents[msg.sender].wallet == address(0), "AgentRegistry: already registered");
        require(bytes(name).length > 0, "AgentRegistry: empty name");
        require(dailyBudget > 0, "AgentRegistry: zero budget");

        agents[msg.sender] = Agent({
            wallet: msg.sender,
            name: name,
            dailyBudget: dailyBudget,
            spentToday: 0,
            lastResetDay: block.timestamp / 1 days,
            active: true,
            registeredAt: block.timestamp
        });

        agentList.push(msg.sender);

        emit AgentRegistered(msg.sender, name, dailyBudget);
    }

    /**
     * @notice Deactivates the calling agent, preventing further spending.
     */
    function deactivateAgent() external onlyRegistered {
        agents[msg.sender].active = false;
        emit AgentDeactivated(msg.sender);
    }

    /**
     * @notice Updates the daily budget for the calling agent.
     * @param newBudget New daily budget in wei.
     */
    function updateBudget(uint256 newBudget) external onlyRegistered {
        require(newBudget > 0, "AgentRegistry: zero budget");
        agents[msg.sender].dailyBudget = newBudget;
        emit BudgetUpdated(msg.sender, newBudget);
    }

    /**
     * @notice Checks if an agent can spend a given amount within their daily budget.
     * @dev Automatically accounts for daily reset without modifying state.
     * @param agent Address of the agent.
     * @param amount Amount the agent wants to spend.
     * @return True if the agent is active and has sufficient budget remaining.
     */
    function canSpend(address agent, uint256 amount) external view returns (bool) {
        Agent storage a = agents[agent];
        if (a.wallet == address(0) || !a.active) return false;

        uint256 currentDay = block.timestamp / 1 days;
        uint256 spent = a.lastResetDay < currentDay ? 0 : a.spentToday;

        return spent + amount <= a.dailyBudget;
    }

    /**
     * @notice Records a spend for an agent. Only callable by PaymentLedger.
     * @dev Resets daily spend if a new day has started.
     * @param agent Address of the agent.
     * @param amount Amount to record as spent.
     */
    function recordSpend(address agent, uint256 amount) external onlyPaymentLedger {
        Agent storage a = agents[agent];
        require(a.wallet != address(0), "AgentRegistry: agent not registered");
        require(a.active, "AgentRegistry: agent not active");

        uint256 currentDay = block.timestamp / 1 days;

        // Reset daily spend if a new day has started
        if (a.lastResetDay < currentDay) {
            a.spentToday = 0;
            a.lastResetDay = currentDay;
        }

        require(a.spentToday + amount <= a.dailyBudget, "AgentRegistry: exceeds daily budget");
        a.spentToday += amount;
    }

    /**
     * @notice Returns the full Agent struct for a given wallet.
     * @param wallet Address of the agent.
     * @return The Agent struct.
     */
    function getAgent(address wallet) external view returns (Agent memory) {
        require(agents[wallet].wallet != address(0), "AgentRegistry: agent not found");
        return agents[wallet];
    }

    /**
     * @notice Returns the total number of registered agents.
     * @return Count of registered agents.
     */
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }
}
