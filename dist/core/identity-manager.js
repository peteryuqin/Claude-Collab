"use strict";
/**
 * HarmonyCode v3.2.0 - Identity Manager
 * Implements persistent agent identity separate from roles and sessions
 * Enhanced with unique name enforcement and session cleanup (v3.2)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class IdentityManager {
    constructor(workspacePath = '.harmonycode') {
        this.identities = new Map();
        this.tokenToAgent = new Map();
        this.sessionToAgent = new Map();
        this.nameToAgent = new Map(); // New: displayName -> agentId mapping
        this.persistPath = path.join(workspacePath, 'identities.json');
        this.loadIdentities();
    }
    /**
     * Register a new agent or retrieve existing one
     */
    registerAgent(displayName, role = 'general') {
        // This method should only be called for new agents in v3.2
        // Use getOrCreateAgent for the new behavior
        // For backward compatibility, still create new agent
        // but log a warning
        console.warn(`Warning: Creating new agent with name '${displayName}'. Multiple agents with same name detected.`);
        // Create new agent identity
        const agentId = this.generateAgentId();
        const authToken = this.generateAuthToken();
        const identity = {
            agentId,
            displayName,
            firstSeen: new Date(),
            lastSeen: new Date(),
            currentRole: role,
            roleHistory: [{
                    role,
                    timestamp: new Date(),
                    sessionId: 'initial'
                }],
            perspectiveHistory: [],
            stats: {
                totalSessions: 0,
                totalMessages: 0,
                totalTasks: 0,
                totalEdits: 0,
                diversityScore: 0.5,
                agreementRate: 0.5,
                evidenceRate: 0.5
            },
            authToken
        };
        this.identities.set(agentId, identity);
        this.tokenToAgent.set(authToken, agentId);
        this.nameToAgent.set(displayName, agentId); // Track name -> agentId mapping
        this.saveIdentities();
        return identity;
    }
    /**
     * Authenticate an agent using their token
     */
    authenticateAgent(authToken) {
        const agentId = this.tokenToAgent.get(authToken);
        if (!agentId)
            return null;
        const identity = this.identities.get(agentId);
        if (!identity)
            return null;
        // Update last seen
        identity.lastSeen = new Date();
        this.saveIdentities();
        return identity;
    }
    /**
     * Connect an agent to a session
     */
    connectAgentToSession(agentId, sessionId) {
        const identity = this.identities.get(agentId);
        if (!identity)
            return;
        // Disconnect from previous session if any
        if (identity.currentSessionId) {
            this.sessionToAgent.delete(identity.currentSessionId);
        }
        // Connect to new session
        identity.currentSessionId = sessionId;
        identity.lastActivityTime = new Date(); // v3.2: Track activity
        identity.stats.totalSessions++;
        this.sessionToAgent.set(sessionId, agentId);
        this.saveIdentities();
    }
    /**
     * Disconnect an agent from their session
     */
    disconnectAgent(sessionId) {
        const agentId = this.sessionToAgent.get(sessionId);
        if (!agentId)
            return;
        const identity = this.identities.get(agentId);
        if (identity) {
            identity.currentSessionId = undefined;
            this.saveIdentities();
        }
        this.sessionToAgent.delete(sessionId);
    }
    /**
     * Change an agent's role
     */
    changeAgentRole(agentId, newRole, sessionId) {
        const identity = this.identities.get(agentId);
        if (!identity)
            return;
        // Record role transition
        identity.roleHistory.push({
            role: identity.currentRole,
            timestamp: new Date(),
            sessionId
        });
        identity.currentRole = newRole;
        this.saveIdentities();
    }
    /**
     * Change an agent's perspective (for diversity)
     */
    changeAgentPerspective(agentId, newPerspective, reason) {
        const identity = this.identities.get(agentId);
        if (!identity)
            return;
        // Record perspective transition
        if (identity.currentPerspective) {
            identity.perspectiveHistory.push({
                perspective: identity.currentPerspective,
                timestamp: new Date(),
                reason
            });
        }
        identity.currentPerspective = newPerspective;
        this.saveIdentities();
    }
    /**
     * Get agent by session ID
     */
    getAgentBySessionId(sessionId) {
        const agentId = this.sessionToAgent.get(sessionId);
        if (!agentId)
            return null;
        return this.identities.get(agentId) || null;
    }
    /**
     * Get agent by agent ID
     */
    getAgentById(agentId) {
        return this.identities.get(agentId) || null;
    }
    /**
     * Update agent statistics
     */
    updateAgentStats(agentId, updates) {
        const identity = this.identities.get(agentId);
        if (!identity)
            return;
        identity.stats = {
            ...identity.stats,
            ...updates
        };
        this.saveIdentities();
    }
    /**
     * Get all active agents
     */
    getActiveAgents() {
        return Array.from(this.identities.values())
            .filter(agent => agent.currentSessionId !== undefined);
    }
    /**
     * Get agents by role
     */
    getAgentsByRole(role) {
        return Array.from(this.identities.values())
            .filter(agent => agent.currentRole === role);
    }
    /**
     * Get agent history report
     */
    getAgentHistoryReport(agentId) {
        const identity = this.identities.get(agentId);
        if (!identity)
            return 'Agent not found';
        const report = [
            `Agent: ${identity.displayName} (${identity.agentId})`,
            `First seen: ${identity.firstSeen.toISOString()}`,
            `Last seen: ${identity.lastSeen.toISOString()}`,
            `Current role: ${identity.currentRole}`,
            `Total sessions: ${identity.stats.totalSessions}`,
            ``,
            `Role History:`,
            ...identity.roleHistory.map(r => `  - ${r.role} at ${r.timestamp.toISOString()}`),
            ``,
            `Diversity Metrics:`,
            `  - Diversity score: ${identity.stats.diversityScore}`,
            `  - Agreement rate: ${identity.stats.agreementRate}`,
            `  - Evidence rate: ${identity.stats.evidenceRate}`
        ];
        return report.join('\n');
    }
    /**
     * Find agent by display name (v3.2)
     */
    findAgentByDisplayName(displayName) {
        const agentId = this.nameToAgent.get(displayName);
        if (!agentId)
            return null;
        return this.identities.get(agentId) || null;
    }
    /**
     * Check if a display name is available (v3.2)
     */
    isNameAvailable(displayName) {
        return !this.nameToAgent.has(displayName);
    }
    /**
     * Get or create agent with unique name enforcement (v3.2)
     */
    getOrCreateAgent(displayName, role = 'general', authToken) {
        // If auth token provided, try to authenticate first
        if (authToken) {
            const authenticated = this.authenticateAgent(authToken);
            if (authenticated) {
                return authenticated;
            }
        }
        // Check if name already exists
        const existing = this.findAgentByDisplayName(displayName);
        if (existing) {
            // Update last seen and return existing agent
            existing.lastSeen = new Date();
            this.saveIdentities();
            return existing;
        }
        // Create new agent with unique name
        return this.createNewAgent(displayName, role);
    }
    /**
     * Create new agent with unique name (v3.2)
     */
    createNewAgent(displayName, role) {
        const agentId = this.generateAgentId();
        const authToken = this.generateAuthToken();
        const identity = {
            agentId,
            displayName,
            firstSeen: new Date(),
            lastSeen: new Date(),
            currentRole: role,
            roleHistory: [{
                    role,
                    timestamp: new Date(),
                    sessionId: 'initial'
                }],
            perspectiveHistory: [],
            stats: {
                totalSessions: 0,
                totalMessages: 0,
                totalTasks: 0,
                totalEdits: 0,
                diversityScore: 0.5,
                agreementRate: 0.5,
                evidenceRate: 0.5
            },
            authToken
        };
        this.identities.set(agentId, identity);
        this.tokenToAgent.set(authToken, agentId);
        this.nameToAgent.set(displayName, agentId);
        this.saveIdentities();
        return identity;
    }
    /**
     * Get name suggestions when a name is taken (v3.2)
     */
    getNameSuggestions(baseName, count = 3) {
        const suggestions = [];
        let counter = 2;
        // Try numbered suffixes
        while (suggestions.length < count && counter <= 10) {
            const suggestion = `${baseName}${counter}`;
            if (this.isNameAvailable(suggestion)) {
                suggestions.push(suggestion);
            }
            counter++;
        }
        // Try with underscores
        if (suggestions.length < count) {
            const suggestion = `${baseName}_new`;
            if (this.isNameAvailable(suggestion)) {
                suggestions.push(suggestion);
            }
        }
        // Try with role suffix
        if (suggestions.length < count) {
            const suggestion = `${baseName}_agent`;
            if (this.isNameAvailable(suggestion)) {
                suggestions.push(suggestion);
            }
        }
        return suggestions.slice(0, count);
    }
    /**
     * Update agent activity time (v3.2)
     */
    updateAgentActivity(agentId) {
        const identity = this.identities.get(agentId);
        if (identity && identity.currentSessionId) {
            identity.lastActivityTime = new Date();
            this.saveIdentities();
        }
    }
    /**
     * Clean up inactive sessions (v3.2)
     */
    cleanupInactiveSessions(timeoutMs = 300000) {
        let cleanedCount = 0;
        const cutoffTime = new Date(Date.now() - timeoutMs);
        for (const [agentId, identity] of this.identities) {
            if (identity.currentSessionId &&
                identity.lastActivityTime &&
                identity.lastActivityTime < cutoffTime) {
                console.log(`🧹 Cleaning up inactive session for ${identity.displayName} (${agentId})`);
                // Disconnect from session
                this.sessionToAgent.delete(identity.currentSessionId);
                identity.currentSessionId = undefined;
                identity.lastActivityTime = undefined;
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.saveIdentities();
            console.log(`✅ Cleaned up ${cleanedCount} inactive sessions`);
        }
        return cleanedCount;
    }
    /**
     * Get session activity report (v3.2)
     */
    getSessionActivityReport() {
        const activeAgents = this.getActiveAgents();
        const totalAgents = this.identities.size;
        return {
            active: activeAgents.length,
            inactive: totalAgents - activeAgents.length,
            total: totalAgents
        };
    }
    /**
     * Generate unique agent ID
     */
    generateAgentId() {
        return `agent-${crypto.randomBytes(8).toString('hex')}`;
    }
    /**
     * Generate authentication token
     */
    generateAuthToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * Load identities from disk
     */
    loadIdentities() {
        try {
            if (fs.existsSync(this.persistPath)) {
                const data = fs.readFileSync(this.persistPath, 'utf-8');
                const parsed = JSON.parse(data);
                // Reconstruct maps
                parsed.identities.forEach((identity) => {
                    // Convert date strings back to Date objects
                    identity.firstSeen = new Date(identity.firstSeen);
                    identity.lastSeen = new Date(identity.lastSeen);
                    identity.roleHistory.forEach((r) => {
                        r.timestamp = new Date(r.timestamp);
                    });
                    identity.perspectiveHistory.forEach((p) => {
                        p.timestamp = new Date(p.timestamp);
                    });
                    this.identities.set(identity.agentId, identity);
                    this.tokenToAgent.set(identity.authToken, identity.agentId);
                    this.nameToAgent.set(identity.displayName, identity.agentId); // v3.2: Track name mapping
                    if (identity.currentSessionId) {
                        this.sessionToAgent.set(identity.currentSessionId, identity.agentId);
                    }
                });
            }
        }
        catch (error) {
            console.error('Failed to load identities:', error);
        }
    }
    /**
     * Save identities to disk
     */
    saveIdentities() {
        try {
            const data = {
                identities: Array.from(this.identities.values()),
                version: '3.2.0'
            };
            fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('Failed to save identities:', error);
        }
    }
}
exports.IdentityManager = IdentityManager;
//# sourceMappingURL=identity-manager.js.map