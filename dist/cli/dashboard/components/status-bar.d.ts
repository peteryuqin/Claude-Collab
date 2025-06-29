export = StatusBar;
declare class StatusBar {
    constructor(grid: any, options: any);
    options: any;
    widget: any;
    status: string;
    message: string;
    serverInfo: {};
    lastUpdate: Date;
    setStatus(status: any, message: any): void;
    setServerInfo(info: any): void;
    update(): void;
    getStatusIcon(): "{green-fg}●{/}" | "{gray-fg}●{/}" | "{red-fg}●{/}" | "{yellow-fg}◐{/}";
    getStatusColor(): "green-fg" | "red-fg" | "yellow-fg" | "white-fg";
    startClock(): void;
    focus(): boolean;
}
//# sourceMappingURL=status-bar.d.ts.map