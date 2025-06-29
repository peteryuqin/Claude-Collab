export class MemoryManager {
    dbPath: string;
    db: any;
    /**
     * Initialize database schema
     */
    initDatabase(): void;
    /**
     * Store a value in memory
     */
    store(key: any, value: any, options?: {}): {
        success: boolean;
        key: any;
        type: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";
        size: number;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        key?: undefined;
        type?: undefined;
        size?: undefined;
    };
    /**
     * Retrieve a value from memory
     */
    get(key: any): {
        success: boolean;
        value: any;
        type: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        value?: undefined;
        type?: undefined;
    };
    /**
     * List all keys with optional filtering
     */
    list(options?: {}): {
        success: boolean;
        count: any;
        keys: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        count?: undefined;
        keys?: undefined;
    };
    /**
     * Delete a key from memory
     */
    delete(key: any): {
        success: boolean;
        deleted: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        deleted?: undefined;
    };
    /**
     * Clear all memory
     */
    clear(): {
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    };
    /**
     * Get memory statistics
     */
    stats(): {
        success: boolean;
        stats: {
            totalKeys: any;
            totalSize: any;
            avgAccessCount: number;
            maxAccessCount: any;
            keysWithTTL: any;
            types: any;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        stats?: undefined;
    };
    /**
     * Export memory to JSON
     */
    export(filepath: any): {
        success: boolean;
        count: any;
        filepath: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        count?: undefined;
        filepath?: undefined;
    };
    /**
     * Import memory from JSON
     */
    import(filepath: any): {
        success: boolean;
        imported: number;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        imported?: undefined;
    };
    /**
     * Clean up expired entries
     */
    cleanupExpired(): any;
    /**
     * Close database connection
     */
    close(): void;
}
//# sourceMappingURL=memory-manager.d.ts.map