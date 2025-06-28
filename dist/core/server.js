"use strict";
/**
 * Claude-Collab v3.2.0 - Core WebSocket Server
 * Real-time collaboration with anti-echo-chamber enforcement
 * Enhanced with unique name enforcement and session cleanup
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
exports.ClaudeCollabServer = void 0;
const ws_1 = require("ws");
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const middleware_1 = require("../diversity/middleware");
const engine_1 = require("../orchestration/engine");
const session_manager_enhanced_1 = require("./session-manager-enhanced");
const identity_manager_1 = require("./identity-manager");
const message_router_1 = require("./message-router");
const realtime_enhancer_1 = require("./realtime-enhancer");
class ClaudeCollabServer extends events_1.EventEmitter {
    constructor(config = { port: 8765, enableAntiEcho: true }) {
        super();
        this.config = config;
        this.projectPath = process.cwd();
        this.identityManager = new identity_manager_1.IdentityManager(path.join(this.projectPath, '.claude-collab'));
        this.sessions = new session_manager_enhanced_1.EnhancedSessionManager(this.identityManager);
        this.router = new message_router_1.MessageRouter();
        this.diversity = new middleware_1.DiversityMiddleware(config.diversityConfig);
        this.orchestration = new engine_1.OrchestrationEngine(config.orchestrationConfig);
        this.realtimeEnhancer = new realtime_enhancer_1.RealtimeEnhancer({
            watchPaths: [path.join(this.projectPath, '.claude-collab')],
            enableNotifications: true,
            enableLiveCursors: true
        });
        // Connect components
        this.diversity.on('intervention', this.handleDiversityIntervention.bind(this));
        this.orchestration.on('taskCreated', this.broadcastTask.bind(this));
    }
    /**
     * Start the HarmonyCode server
     */
    async start() {
        this.wss = new ws_1.WebSocketServer({ port: this.config.port });
        console.log(`
╔════════════════════════════════════════════════════════╗
║           🎵 Claude-Collab v3.2.0 Server 🎵            ║
║                                                        ║
║  Real-time collaboration with persistent identity      ║
║  Anti-echo-chamber: ${this.config.enableAntiEcho ? 'ENABLED ✓' : 'DISABLED'}                           ║
╚════════════════════════════════════════════════════════╝
    `);
        console.log(`🚀 Server running on ws://localhost:${this.config.port}`);
        console.log(`📂 Project directory: ${this.projectPath}\n`);
        // Initialize project structure
        this.initializeProjectStructure();
        // Set up WebSocket handlers
        this.wss.on('connection', this.handleConnection.bind(this));
        // Start orchestration engine
        await this.orchestration.initialize();
        // Start real-time file watching
        this.realtimeEnhancer.startWatching();
        this.setupRealtimeHandlers();
        // Monitor diversity metrics
        if (this.config.enableAntiEcho) {
            this.startDiversityMonitoring();
        }
        // Start session cleanup (v3.2)
        this.startSessionCleanup();
    }
    /**
     * Check version compatibility between client and server (v3.2)
     */
    checkVersionCompatibility(clientVersion) {
        const serverVersion = '3.2.0';
        if (!clientVersion) {
            return {
                message: 'Client version unknown - please upgrade your CLI',
                severity: 'warning',
                upgradeAction: 'npm install -g claude-collab@latest'
            };
        }
        if (clientVersion === serverVersion) {
            return null; // Perfect match
        }
        const parseVersion = (version) => {
            const parts = version.replace(/[^0-9.]/g, '').split('.');
            return {
                major: parseInt(parts[0] || '0'),
                minor: parseInt(parts[1] || '0'),
                patch: parseInt(parts[2] || '0')
            };
        };
        const client = parseVersion(clientVersion);
        const server = parseVersion(serverVersion);
        // Major version difference (breaking changes)
        if (client.major !== server.major) {
            return {
                message: `Major version mismatch! Client: ${clientVersion}, Server: ${serverVersion}`,
                severity: 'error',
                upgradeAction: client.major < server.major
                    ? `npm install -g claude-collab@${serverVersion}`
                    : 'Server needs upgrading'
            };
        }
        // Minor version difference (new features)
        if (client.minor !== server.minor) {
            const isClientOlder = client.minor < server.minor ||
                (client.minor === server.minor && client.patch < server.patch);
            return {
                message: isClientOlder
                    ? `Client outdated: ${clientVersion} < ${serverVersion}. Missing v3.2 features!`
                    : `Client newer: ${clientVersion} > ${serverVersion}. Some features may not work.`,
                severity: 'warning',
                upgradeAction: isClientOlder
                    ? `npm install -g claude-collab@${serverVersion}`
                    : 'Consider upgrading server'
            };
        }
        // Patch version difference (bug fixes)
        if (client.patch !== server.patch) {
            const isClientOlder = client.patch < server.patch;
            return {
                message: isClientOlder
                    ? `Client has older patch: ${clientVersion} (latest: ${serverVersion})`
                    : `Client has newer patch: ${clientVersion} (server: ${serverVersion})`,
                severity: 'warning',
                upgradeAction: isClientOlder ? `npm install -g harmonycode@${serverVersion}` : undefined
            };
        }
        return null;
    }
    /**
     * Handle new WebSocket connection with identity support
     */
    handleConnection(ws, req) {
        const sessionId = this.generateSessionId();
        // Don't create session yet - wait for authentication
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === 'auth') {
                    await this.handleAuthentication(ws, sessionId, message);
                }
                else if (message.type === 'register') {
                    await this.handleRegistration(ws, message);
                }
                else {
                    // Reject non-auth messages from unauthenticated connections
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Authentication required. Send auth message first.'
                    }));
                }
            }
            catch (error) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format'
                }));
            }
        });
        ws.on('error', (error) => console.error('WebSocket error:', error));
    }
    /**
     * Handle agent authentication
     */
    async handleAuthentication(ws, sessionId, authMessage) {
        try {
            const { agentName, authToken, role = 'general', perspective, clientVersion } = authMessage;
            // Version compatibility check (v3.2)
            const versionWarning = this.checkVersionCompatibility(clientVersion);
            if (versionWarning) {
                console.log(`⚠️  Version mismatch for ${agentName}: ${versionWarning.message}`);
            }
            // Create or authenticate session
            const session = this.sessions.createSession(sessionId, ws, authToken, agentName, role);
            const agentIdentity = session.agentIdentity;
            const isReturning = agentIdentity.stats.totalSessions > 1;
            console.log(`✅ ${agentIdentity.displayName} connected (${session.currentRole})`);
            console.log(`   Agent ID: ${agentIdentity.agentId}`);
            if (isReturning) {
                console.log(`   Welcome back! Sessions: ${agentIdentity.stats.totalSessions}`);
            }
            // Send auth success with identity info
            ws.send(JSON.stringify({
                type: 'auth-success',
                agentId: agentIdentity.agentId,
                authToken: agentIdentity.authToken,
                isReturning,
                totalSessions: agentIdentity.stats.totalSessions,
                totalContributions: agentIdentity.stats.totalMessages + agentIdentity.stats.totalTasks + agentIdentity.stats.totalEdits,
                lastSeen: agentIdentity.lastSeen,
                serverVersion: '3.2.0',
                clientVersion: clientVersion || 'unknown',
                versionWarning: versionWarning || null, // v3.2: Include version compatibility warning
                capabilities: {
                    realtime: true,
                    orchestration: true,
                    antiEchoChamber: this.config.enableAntiEcho,
                    persistentIdentity: true,
                    sparcModes: this.orchestration.getAvailableModes()
                }
            }));
            // Assign perspective if anti-echo enabled
            if (this.config.enableAntiEcho && perspective) {
                this.sessions.changeSessionPerspective(sessionId, perspective);
                console.log(`   Assigned perspective: ${perspective}`);
            }
            else if (this.config.enableAntiEcho) {
                const assignedPerspective = this.diversity.assignPerspective(sessionId);
                this.sessions.changeSessionPerspective(sessionId, assignedPerspective);
                console.log(`   Assigned perspective: ${assignedPerspective}`);
            }
            // Set up authenticated message handlers
            ws.removeAllListeners('message');
            ws.on('message', (data) => this.handleMessage(session, data));
            ws.on('close', () => this.handleDisconnect(session));
            // Set up real-time update stream for this session
            this.realtimeEnhancer.createUpdateStream(ws);
            // Notify other sessions
            this.broadcastSessionUpdate('joined', session);
        }
        catch (error) {
            console.error('Authentication error:', error);
            ws.send(JSON.stringify({
                type: 'auth-failed',
                reason: error.message || 'Authentication failed'
            }));
            ws.close();
        }
    }
    /**
     * Handle agent registration (v3.2)
     */
    async handleRegistration(ws, registerMessage) {
        try {
            const { agentName, role = 'general', forceNew = false } = registerMessage;
            if (!agentName) {
                ws.send(JSON.stringify({
                    type: 'register-failed',
                    reason: 'Agent name is required'
                }));
                ws.close();
                return;
            }
            // Check if name is available
            if (!forceNew && !this.identityManager.isNameAvailable(agentName)) {
                const suggestions = this.identityManager.getNameSuggestions(agentName, 3);
                ws.send(JSON.stringify({
                    type: 'register-failed',
                    reason: 'name-taken',
                    suggestions
                }));
                ws.close();
                return;
            }
            // Create new agent identity
            const identity = forceNew
                ? this.identityManager.registerAgent(agentName, role) // Allow duplicate if forced
                : this.identityManager.createNewAgent(agentName, role);
            console.log(`✅ New agent registered: ${agentName} (${identity.agentId})`);
            // Send success response
            ws.send(JSON.stringify({
                type: 'register-success',
                agentId: identity.agentId,
                agentName: identity.displayName,
                authToken: identity.authToken,
                role: identity.currentRole
            }));
            ws.close();
        }
        catch (error) {
            console.error('Registration error:', error);
            ws.send(JSON.stringify({
                type: 'register-failed',
                reason: error.message || 'Registration failed'
            }));
            ws.close();
        }
    }
    /**
     * Handle incoming message with diversity checks
     */
    async handleMessage(session, data) {
        try {
            const message = JSON.parse(data.toString());
            // Log message for analysis
            console.log(`💬 ${session.name}: ${message.type}`);
            // Apply diversity middleware if enabled
            if (this.config.enableAntiEcho && this.shouldCheckDiversity(message.type)) {
                const diversityCheck = await this.diversity.checkMessage({
                    sessionId: session.id,
                    content: message.content || message.text,
                    type: message.type,
                    evidence: message.evidence
                });
                if (!diversityCheck.allowed) {
                    // Send intervention requirement
                    session.ws.send(JSON.stringify({
                        type: 'diversity-intervention',
                        reason: diversityCheck.reason,
                        requiredAction: diversityCheck.requiredAction,
                        suggestions: diversityCheck.suggestions
                    }));
                    console.log(`❌ Diversity check failed: ${diversityCheck.reason}`);
                    return;
                }
            }
            // Route message through orchestration if needed
            if (this.shouldOrchestrate(message.type)) {
                await this.orchestration.processMessage(session.id, message);
            }
            // Handle different message types
            switch (message.type) {
                case 'edit':
                    await this.handleEdit(session, message);
                    this.sessions.incrementSessionMetric(session.id, 'edits');
                    break;
                case 'task':
                    await this.handleTask(session, message);
                    if (message.action === 'create' || message.action === 'complete') {
                        this.sessions.incrementSessionMetric(session.id, 'tasks');
                    }
                    break;
                case 'vote':
                    await this.handleVote(session, message);
                    break;
                case 'message':
                    await this.handleChatMessage(session, message);
                    this.sessions.incrementSessionMetric(session.id, 'messages');
                    break;
                case 'spawn':
                    await this.handleSpawnRequest(session, message);
                    break;
                case 'whoami':
                    await this.handleWhoAmI(session);
                    break;
                case 'switch-role':
                    await this.handleRoleSwitch(session, message);
                    break;
                case 'get-history':
                    await this.handleGetHistory(session);
                    break;
                default:
                    // Let router handle custom messages
                    await this.router.route(session, message);
            }
            // Record in diversity tracker
            if (this.config.enableAntiEcho) {
                this.diversity.recordContribution(session.id, message);
            }
            // Update activity time for session cleanup (v3.2)
            this.identityManager.updateAgentActivity(session.agentId);
        }
        catch (error) {
            console.error(`Error handling message from ${session.name}:`, error);
            session.ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process message'
            }));
        }
    }
    /**
     * Handle collaborative editing with conflict resolution
     */
    async handleEdit(session, message) {
        const { file, edit, version } = message;
        // Apply edit through conflict resolution
        const result = await this.orchestration.applyEdit({
            file,
            edit,
            version,
            sessionId: session.id
        });
        if (result.conflict) {
            // Use diversity-weighted resolution
            const resolution = await this.diversity.resolveConflict(result.conflicts || []);
            // Broadcast resolved edit
            this.broadcast({
                type: 'edit-resolved',
                file,
                edit: resolution.edit,
                resolvedBy: 'diversity-weighted-consensus',
                confidence: resolution.confidence
            });
        }
        else {
            // Broadcast successful edit
            this.broadcast({
                type: 'edit',
                file,
                edit,
                sessionId: session.id,
                timestamp: Date.now()
            }, session.id);
        }
    }
    /**
     * Handle task creation and assignment
     */
    async handleTask(session, message) {
        const { action, task } = message;
        switch (action) {
            case 'create':
                // Create task with diversity requirements
                const enhancedTask = {
                    ...task,
                    requiresPerspectives: this.diversity.getRequiredPerspectives(task.type),
                    evidenceRequired: task.type === 'decision' || task.type === 'analysis'
                };
                const created = await this.orchestration.createTask(enhancedTask);
                this.broadcastTask('created', created);
                break;
            case 'claim':
                // Check if agent perspective matches task needs
                const canClaim = await this.diversity.canClaimTask(session.id, task.id);
                if (canClaim) {
                    await this.orchestration.assignTask(task.id, session.id);
                    this.broadcastTask('assigned', { taskId: task.id, agentId: session.id });
                }
                else {
                    session.ws.send(JSON.stringify({
                        type: 'task-rejection',
                        reason: 'Perspective mismatch - different viewpoint needed'
                    }));
                }
                break;
        }
    }
    /**
     * Handle voting with diversity weighting
     */
    async handleVote(session, message) {
        const { proposalId, vote, evidence } = message;
        // Record vote with perspective weight
        const weight = this.diversity.calculateVoteWeight(session.id, vote, evidence);
        await this.orchestration.recordVote({
            proposalId,
            sessionId: session.id,
            vote,
            weight,
            evidence,
            perspective: session.perspective
        });
        // Check if voting complete
        const result = await this.orchestration.checkVotingComplete(proposalId);
        if (result.complete) {
            // Resolve with diversity-weighted consensus
            const decision = await this.diversity.resolveDecision(result.votes || []);
            this.broadcast({
                type: 'decision-made',
                proposalId,
                decision: decision.choice,
                confidence: decision.confidence,
                diversityScore: decision.diversityScore,
                perspectives: decision.perspectivesRepresented
            });
        }
    }
    /**
     * Handle SPARC mode spawn requests
     */
    async handleSpawnRequest(session, message) {
        const { mode, task, count = 1 } = message;
        // Spawn agents with diverse perspectives
        const agents = await this.orchestration.spawnAgents({
            mode, // researcher, coder, analyst, etc.
            task,
            count,
            ensureDiversity: this.config.enableAntiEcho
        });
        // Assign complementary perspectives
        if (this.config.enableAntiEcho) {
            agents.forEach(agent => {
                const perspective = this.diversity.assignComplementaryPerspective(this.sessions.getActivePerspectives());
                agent.perspective = perspective;
            });
        }
        session.ws.send(JSON.stringify({
            type: 'agents-spawned',
            agents: agents.map(a => ({
                id: a.id,
                mode: a.mode,
                perspective: a.perspective,
                capabilities: a.capabilities
            }))
        }));
    }
    /**
     * Handle diversity intervention events
     */
    handleDiversityIntervention(intervention) {
        const session = this.sessions.getSession(intervention.targetAgent);
        if (session) {
            session.ws.send(JSON.stringify({
                type: 'intervention-required',
                interventionType: intervention.type,
                reason: intervention.reason,
                requiredAction: intervention.requiredAction,
                deadline: intervention.deadline
            }));
            // Log intervention
            console.log(`🚨 Diversity intervention for ${session.agentIdentity.displayName}: ${intervention.reason}`);
        }
    }
    /**
     * Monitor and report diversity metrics
     */
    startDiversityMonitoring() {
        setInterval(() => {
            const metrics = this.diversity.getMetrics();
            // Broadcast metrics to all sessions
            this.broadcast({
                type: 'diversity-metrics',
                metrics: {
                    overallDiversity: metrics.overallDiversity,
                    agreementRate: metrics.agreementRate,
                    evidenceRate: metrics.evidenceRate,
                    perspectiveDistribution: metrics.perspectiveDistribution,
                    recentInterventions: metrics.interventions
                }
            });
            // Log warnings if needed
            if (metrics.agreementRate > 0.8) {
                console.log('⚠️  High agreement rate detected - echo chamber risk!');
            }
            if (metrics.overallDiversity < 0.5) {
                console.log('⚠️  Low diversity score - consider perspective rotation');
            }
        }, 30000); // Every 30 seconds
    }
    /**
     * Start session cleanup for ghost sessions (v3.2)
     */
    startSessionCleanup() {
        this.cleanupInterval = setInterval(() => {
            const cleanedCount = this.identityManager.cleanupInactiveSessions(300000); // 5 minutes
            if (cleanedCount > 0) {
                // Broadcast session update to remaining clients
                this.broadcast({
                    type: 'session-cleanup',
                    cleanedSessions: cleanedCount,
                    timestamp: Date.now()
                });
            }
            // Log session activity report every hour
            const now = new Date();
            if (now.getMinutes() === 0) {
                const report = this.identityManager.getSessionActivityReport();
                console.log(`📊 Session Activity: ${report.active} active, ${report.inactive} inactive, ${report.total} total`);
            }
        }, 60000); // Every minute
    }
    /**
     * Initialize project directory structure
     */
    initializeProjectStructure() {
        const dirs = [
            '.claude-collab',
            '.claude-collab/tasks',
            '.claude-collab/messages',
            '.claude-collab/memory',
            '.claude-collab/decisions'
        ];
        dirs.forEach(dir => {
            const fullPath = path.join(this.projectPath, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
        // Create discussion board if doesn't exist
        const boardPath = path.join(this.projectPath, '.claude-collab', 'DISCUSSION_BOARD.md');
        if (!fs.existsSync(boardPath)) {
            fs.writeFileSync(boardPath, '# Discussion Board\n\nAI agents discuss here with diversity enforcement.\n\n');
        }
    }
    /**
     * Set up real-time event handlers
     */
    setupRealtimeHandlers() {
        // Handle task board updates
        this.realtimeEnhancer.on('task-board-updated', (event) => {
            console.log('📋 Task board updated - notifying all sessions');
            this.broadcast({
                type: 'realtime-update',
                updateType: 'task-board',
                timestamp: event.timestamp
            });
        });
        // Handle discussion updates
        this.realtimeEnhancer.on('discussion-updated', (event) => {
            console.log('💬 Discussion board updated - notifying all sessions');
            this.broadcast({
                type: 'realtime-update',
                updateType: 'discussion',
                timestamp: event.timestamp
            });
        });
        // Handle new messages
        this.realtimeEnhancer.on('new-message', (event) => {
            console.log('📨 New message detected');
            this.broadcast({
                type: 'realtime-update',
                updateType: 'new-message',
                filename: event.filename,
                timestamp: event.timestamp
            });
        });
        // Handle concurrent editing notifications
        this.realtimeEnhancer.on('concurrent-editing', (data) => {
            console.log(`⚠️  Multiple editors on ${data.filepath}`);
            data.editors.forEach((editorId) => {
                const session = this.sessions.getSession(editorId);
                if (session) {
                    session.ws.send(JSON.stringify({
                        type: 'concurrent-editing-warning',
                        filepath: data.filepath,
                        otherEditors: data.editors.filter((id) => id !== editorId)
                    }));
                }
            });
        });
    }
    /**
     * Broadcast message to all or specific sessions
     */
    broadcast(message, excludeSessionId) {
        const data = JSON.stringify(message);
        this.sessions.getAllSessions().forEach(session => {
            if (session.id !== excludeSessionId && session.ws.readyState === ws_1.WebSocket.OPEN) {
                session.ws.send(data);
            }
        });
    }
    /**
     * Broadcast task updates
     */
    broadcastTask(event, task) {
        this.broadcast({
            type: 'task-update',
            event,
            task
        });
    }
    /**
     * Broadcast session updates
     */
    broadcastSessionUpdate(event, session) {
        this.broadcast({
            type: 'session-update',
            event,
            session: {
                id: session.id,
                agentId: session.agentId,
                displayName: session.agentIdentity.displayName,
                role: session.currentRole,
                perspective: session.currentPerspective
            }
        }, session.id);
    }
    /**
     * Handle chat messages
     */
    async handleChatMessage(session, message) {
        // Add to discussion board with identity info
        const boardPath = path.join(this.projectPath, '.claude-collab', 'DISCUSSION_BOARD.md');
        const identity = session.agentIdentity;
        const entry = `\n## ${identity.displayName} (${session.currentRole})\n**Agent ID**: ${identity.agentId}\n**Perspective**: ${session.currentPerspective || 'None'}\n**Time**: ${new Date().toISOString()}\n\n${message.text}\n\n---\n`;
        fs.appendFileSync(boardPath, entry);
        // Broadcast to others
        this.broadcast({
            type: 'chat',
            sessionId: session.id,
            agentId: session.agentId,
            displayName: identity.displayName,
            role: session.currentRole,
            perspective: session.currentPerspective,
            text: message.text,
            timestamp: Date.now()
        }, session.id);
    }
    /**
     * Handle session disconnect
     */
    handleDisconnect(session) {
        console.log(`👋 ${session.name} disconnected`);
        this.sessions.removeSession(session.id);
        this.diversity.removeAgent(session.id);
        this.orchestration.handleAgentDisconnect(session.id);
        this.broadcastSessionUpdate('left', session);
    }
    /**
     * Handle WebSocket errors
     */
    handleError(session, error) {
        console.error(`Error in session ${session.name}:`, error);
    }
    /**
     * Check if message type should be diversity-checked
     */
    shouldCheckDiversity(messageType) {
        const checkedTypes = ['edit', 'vote', 'proposal', 'decision', 'message'];
        return checkedTypes.includes(messageType);
    }
    /**
     * Check if message should be orchestrated
     */
    shouldOrchestrate(messageType) {
        const orchestratedTypes = ['task', 'spawn', 'swarm', 'workflow'];
        return orchestratedTypes.includes(messageType);
    }
    /**
     * Handle identity query with enhanced identity card (v3.2)
     */
    async handleWhoAmI(session) {
        const identity = session.agentIdentity;
        const activeSessions = this.sessions.getAllSessions().length;
        const agentRank = this.calculateAgentRank(identity);
        const timeInSystem = Date.now() - identity.firstSeen.getTime();
        const daysSinceJoined = Math.floor(timeInSystem / (1000 * 60 * 60 * 24));
        session.ws.send(JSON.stringify({
            type: 'identity-card',
            card: {
                // Basic Identity
                agentId: identity.agentId,
                displayName: identity.displayName,
                firstSeen: identity.firstSeen,
                lastSeen: identity.lastSeen,
                daysSinceJoined,
                // Current Status
                currentRole: session.currentRole,
                currentPerspective: session.currentPerspective,
                isActive: true,
                // Statistics & Rankings
                stats: identity.stats,
                rank: agentRank,
                // Session Information
                sessionInfo: {
                    sessionId: session.id,
                    joinedAt: session.joinedAt,
                    currentSessionContributions: {
                        messages: session.sessionMessages || 0,
                        edits: session.sessionEdits || 0,
                        tasks: session.sessionTasks || 0
                    }
                },
                // History & Evolution
                roleHistory: identity.roleHistory.slice(-5), // Last 5 role changes
                perspectiveHistory: identity.perspectiveHistory.slice(-3), // Last 3 perspective changes
                // System Context
                systemInfo: {
                    totalActiveSessions: activeSessions,
                    serverVersion: '3.2.0',
                    antiEchoChamberEnabled: this.config.enableAntiEcho,
                    diversityScore: identity.stats.diversityScore,
                    evidenceRate: identity.stats.evidenceRate
                },
                // Achievement Badges
                badges: this.calculateAchievementBadges(identity),
                // Recommendations
                recommendations: this.generateRecommendations(identity, session)
            }
        }));
    }
    /**
     * Calculate agent rank based on contributions (v3.2)
     */
    calculateAgentRank(identity) {
        const totalContributions = identity.stats.totalMessages + identity.stats.totalTasks + identity.stats.totalEdits;
        const diversityBonus = identity.stats.diversityScore * 10;
        const evidenceBonus = identity.stats.evidenceRate * 5;
        const score = totalContributions + diversityBonus + evidenceBonus;
        if (score >= 100)
            return { title: 'Master Collaborator', level: 5, nextLevel: 'Legend' };
        if (score >= 50)
            return { title: 'Senior Contributor', level: 4, nextLevel: 'Master Collaborator' };
        if (score >= 25)
            return { title: 'Active Member', level: 3, nextLevel: 'Senior Contributor' };
        if (score >= 10)
            return { title: 'Contributor', level: 2, nextLevel: 'Active Member' };
        return { title: 'Newcomer', level: 1, nextLevel: 'Contributor' };
    }
    /**
     * Calculate achievement badges (v3.2)
     */
    calculateAchievementBadges(identity) {
        const badges = [];
        if (identity.stats.totalSessions >= 10)
            badges.push('🏆 Veteran');
        if (identity.stats.diversityScore >= 0.8)
            badges.push('🌈 Diversity Champion');
        if (identity.stats.evidenceRate >= 0.8)
            badges.push('📊 Evidence Expert');
        if (identity.stats.totalMessages >= 50)
            badges.push('💬 Communicator');
        if (identity.stats.totalTasks >= 20)
            badges.push('📋 Task Master');
        if (identity.stats.totalEdits >= 30)
            badges.push('✏️ Editor');
        if (identity.roleHistory.length >= 5)
            badges.push('🎭 Role Explorer');
        const daysSinceJoined = Math.floor((Date.now() - identity.firstSeen.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceJoined >= 30)
            badges.push('📅 Long-term Collaborator');
        if (daysSinceJoined >= 7)
            badges.push('📈 Consistent Contributor');
        return badges;
    }
    /**
     * Generate personalized recommendations (v3.2)
     */
    generateRecommendations(identity, session) {
        const recommendations = [];
        if (identity.stats.diversityScore < 0.5) {
            recommendations.push('Try adopting different perspectives to increase diversity');
        }
        if (identity.stats.evidenceRate < 0.6) {
            recommendations.push('Include more evidence in your arguments and proposals');
        }
        if (identity.roleHistory.length < 3) {
            recommendations.push('Experiment with different roles to broaden your experience');
        }
        if (identity.stats.totalTasks < 5) {
            recommendations.push('Consider creating or claiming tasks to increase collaboration');
        }
        const recentMessages = identity.stats.totalMessages / Math.max(identity.stats.totalSessions, 1);
        if (recentMessages < 2) {
            recommendations.push('Share more insights in discussions to help the team');
        }
        return recommendations;
    }
    /**
     * Handle role switch request
     */
    async handleRoleSwitch(session, message) {
        const { newRole } = message;
        if (!newRole) {
            session.ws.send(JSON.stringify({
                type: 'error',
                message: 'New role required'
            }));
            return;
        }
        this.sessions.changeSessionRole(session.id, newRole);
        session.ws.send(JSON.stringify({
            type: 'role-changed',
            oldRole: session.currentRole,
            newRole: newRole,
            agentId: session.agentId
        }));
        console.log(`🔄 ${session.agentIdentity.displayName} switched role from ${session.currentRole} to ${newRole}`);
        // Notify others
        this.broadcastSessionUpdate('role-changed', session);
    }
    /**
     * Handle history request
     */
    async handleGetHistory(session) {
        const report = this.sessions.getAgentSessionHistory(session.agentId);
        session.ws.send(JSON.stringify({
            type: 'history-report',
            report
        }));
    }
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Extract session ID from WebSocket URL (deprecated)
     */
    extractSessionId(url) {
        const match = url?.match(/\/(.+)$/);
        return match ? match[1] : this.generateSessionId();
    }
    /**
     * Graceful shutdown
     */
    async stop() {
        console.log('\n👋 Shutting down Claude-Collab server...');
        // Save state
        await this.orchestration.saveState();
        await this.diversity.saveMetrics();
        // Stop real-time watchers
        this.realtimeEnhancer.destroy();
        // Stop session cleanup timer (v3.2)
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        // Close connections
        this.sessions.getAllSessions().forEach(session => {
            session.ws.close();
        });
        this.wss.close();
        console.log('✅ Server stopped');
    }
}
exports.ClaudeCollabServer = ClaudeCollabServer;
// Export for use as module
exports.default = ClaudeCollabServer;
// Run if called directly
if (require.main === module) {
    const server = new ClaudeCollabServer({
        port: parseInt(process.env.CLAUDE_COLLAB_PORT || '8765'),
        enableAntiEcho: process.env.DISABLE_ANTI_ECHO !== 'true',
        diversityConfig: {
            minimumDiversity: 0.6,
            disagreementQuota: 0.3,
            evidenceThreshold: 0.5
        },
        orchestrationConfig: {
            enableSPARC: true,
            swarmMode: 'distributed',
            maxAgents: 10
        }
    });
    server.start();
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        await server.stop();
        process.exit(0);
    });
}
//# sourceMappingURL=server.js.map