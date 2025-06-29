export = TerminalDashboard;
declare class TerminalDashboard {
    constructor(serverUrl?: string);
    serverUrl: string;
    connection: CLIConnectionHelper | null;
    agents: Map<any, any>;
    messages: any[];
    metrics: {
        overallDiversity: number;
        agreementRate: number;
        evidenceRate: number;
        activeAgents: number;
        messagesPerMinute: number;
    };
    setupScreen(): void;
    screen: any;
    setupLayout(): void;
    grid: contrib.grid | undefined;
    statusBar: StatusBar | undefined;
    agentList: AgentList | undefined;
    messageFeed: MessageFeed | undefined;
    metricsPanel: MetricsPanel | undefined;
    helpBox: any;
    bindKeyboard(): void;
    connectToServer(): Promise<void>;
    handleServerMessage(message: any): void;
    updateAgents(agents: any): void;
    addMessage(message: any): void;
    updateMetrics(metrics: any): void;
    handleSessionUpdate(update: any): void;
    updateMessageRate(): void;
    focusNext(): void;
    showFilterDialog(): void;
    refresh(): void;
    cleanup(): void;
}
import { CLIConnectionHelper } from "../connection-helper";
import contrib = require("blessed-contrib");
import StatusBar = require("./components/status-bar");
import AgentList = require("./components/agent-list");
import MessageFeed = require("./components/message-feed");
import MetricsPanel = require("./components/metrics-panel");
//# sourceMappingURL=terminal-ui.d.ts.map