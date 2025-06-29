export class SwarmManager {
    /**
     * Stop all swarm agents
     */
    static stopAll(): Promise<void>;
    constructor(objective: any, options: any);
    objective: any;
    options: any;
    agents: Map<any, any>;
    serverUrl: any;
    maxAgents: number;
    strategy: any;
    antiEcho: boolean;
    /**
     * Start the swarm to accomplish the objective
     */
    start(): Promise<void>;
    /**
     * Ensure server is running
     */
    ensureServerRunning(): Promise<void>;
    /**
     * Decompose objective into tasks based on strategy
     */
    decomposeObjective(): {
        id: string;
        description: string;
    }[];
    /**
     * Determine which agents to spawn based on tasks
     */
    determineAgents(tasks: any): any[];
    /**
     * Spawn agents as separate processes
     */
    spawnAgents(agentConfigs: any): Promise<void>;
    /**
     * Create agent script that will run in separate process
     */
    createAgentScript(config: any): string;
    /**
     * Coordinate agents to work together
     */
    coordinateAgents(tasks: any): Promise<void>;
    /**
     * Save swarm state for management
     */
    saveSwarmState(): void;
}
//# sourceMappingURL=swarm-manager.d.ts.map