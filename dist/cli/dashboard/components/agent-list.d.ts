export = AgentList;
declare class AgentList {
    constructor(grid: any, options: any);
    options: any;
    widget: any;
    agents: any[];
    setupEvents(): void;
    update(agents: any): void;
    formatAgent(agent: any): string;
    getStatusIcon(status: any): "{green-fg}●{/}" | "{yellow-fg}●{/}" | "{gray-fg}●{/}" | "{red-fg}●{/}" | "{white-fg}●{/}";
    truncate(str: any, length: any): any;
    showAgentDetails(agent: any): void;
    focus(): void;
}
//# sourceMappingURL=agent-list.d.ts.map