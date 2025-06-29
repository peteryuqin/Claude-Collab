export = MessageFeed;
declare class MessageFeed {
    constructor(grid: any, options: any);
    options: any;
    messages: any[];
    filter: any;
    widget: any;
    setupEvents(): void;
    addMessage(message: any): void;
    addSystemMessage(text: any): void;
    formatMessage(message: any): string;
    highlightKeywords(text: any): any;
    shouldDisplay(message: any): boolean;
    setFilter(filter: any): void;
    clear(): void;
    refresh(): void;
    focus(): void;
}
//# sourceMappingURL=message-feed.d.ts.map