"use strict";
/**
 * Claude-Collab v3.0.0 - Diversity Middleware
 * Integrates Anti-Echo-Chamber system into real-time collaboration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiversityMiddleware = void 0;
const events_1 = require("events");
const diversity_tracker_1 = require("./diversity-tracker");
const perspective_analyzer_1 = require("./perspective-analyzer");
const diversity_enforcer_1 = require("./diversity-enforcer");
const types_1 = require("./types");
class DiversityMiddleware extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.perspectiveAssignments = new Map();
        this.config = {
            enabled: true,
            strictMode: true,
            autoRotation: true,
            learningEnabled: true,
            interventionThreshold: 0.6,
            minimumAgentsForDiversity: 3,
            ...config
        };
        this.requirements = {
            minimumDiversity: config?.minimumDiversity || 0.6,
            requiredPerspectives: [types_1.PerspectiveProfile.SKEPTIC, types_1.PerspectiveProfile.ANALYTICAL],
            disagreementQuota: config?.disagreementQuota || 0.3,
            evidenceThreshold: config?.evidenceThreshold || 0.5,
            perspectiveRotationInterval: 30
        };
        this.tracker = new diversity_tracker_1.DiversityTracker(this.config);
        this.analyzer = new perspective_analyzer_1.PerspectiveAnalyzer();
        this.enforcer = new diversity_enforcer_1.DiversityEnforcer(this.config, this.requirements, this.tracker, this.analyzer);
    }
    /**
     * Check if a message meets diversity requirements
     */
    async checkMessage(context) {
        // Get active agents for context
        const activeAgents = Array.from(this.perspectiveAssignments.keys())
            .filter(id => id !== context.sessionId);
        // Enforce diversity
        const enforcementResult = await this.enforcer.enforceContribution({
            agentId: context.sessionId,
            content: context.content,
            messageType: context.type,
            evidence: context.evidence,
            targetClaim: context.targetClaim,
            otherAgents: activeAgents
        });
        // Emit intervention if needed
        if (enforcementResult.intervention) {
            this.emit('intervention', {
                ...enforcementResult.intervention,
                targetAgent: context.sessionId
            });
        }
        return {
            allowed: enforcementResult.allowed,
            reason: enforcementResult.intervention?.reason,
            requiredAction: enforcementResult.intervention?.requiredAction,
            suggestions: enforcementResult.requiredActions,
            diversityScore: enforcementResult.score
        };
    }
    /**
     * Assign perspective to new agent
     */
    assignPerspective(sessionId) {
        // Get current distribution
        const currentPerspectives = Array.from(this.perspectiveAssignments.values());
        const distribution = this.calculateDistribution(currentPerspectives);
        // Find underrepresented perspective
        let assigned;
        if (currentPerspectives.length < this.requirements.requiredPerspectives.length) {
            // Assign required perspectives first
            const missing = this.requirements.requiredPerspectives.find(p => !currentPerspectives.includes(p));
            assigned = missing || this.selectUnderrepresented(distribution);
        }
        else {
            assigned = this.selectUnderrepresented(distribution);
        }
        // Register assignment
        this.perspectiveAssignments.set(sessionId, assigned);
        this.tracker.registerAgent(sessionId, assigned);
        return assigned;
    }
    /**
     * Assign complementary perspective to balance team
     */
    assignComplementaryPerspective(currentPerspectives) {
        const distribution = this.calculateDistribution(currentPerspectives);
        // Find the most needed perspective
        const complementary = this.findComplementaryPerspective(distribution);
        return complementary;
    }
    /**
     * Get required perspectives for task type
     */
    getRequiredPerspectives(taskType) {
        const taskPerspectives = {
            'decision': [types_1.PerspectiveProfile.SKEPTIC, types_1.PerspectiveProfile.ANALYTICAL],
            'brainstorm': [types_1.PerspectiveProfile.INNOVATOR, types_1.PerspectiveProfile.CREATIVE],
            'review': [types_1.PerspectiveProfile.SKEPTIC, types_1.PerspectiveProfile.DETAIL_ORIENTED],
            'planning': [types_1.PerspectiveProfile.PRAGMATIST, types_1.PerspectiveProfile.BIG_PICTURE],
            'analysis': [types_1.PerspectiveProfile.ANALYTICAL, types_1.PerspectiveProfile.SKEPTIC]
        };
        return taskPerspectives[taskType] || [types_1.PerspectiveProfile.PRAGMATIST];
    }
    /**
     * Check if agent can claim task based on perspective
     */
    async canClaimTask(sessionId, taskId) {
        const agentPerspective = this.perspectiveAssignments.get(sessionId);
        if (!agentPerspective)
            return false;
        // In a real implementation, would check task requirements
        // For now, ensure diverse task assignment
        const assignedAgents = await this.getTaskAssignments(taskId);
        const assignedPerspectives = assignedAgents.map(id => this.perspectiveAssignments.get(id)).filter(p => p !== undefined);
        // Don't allow same perspective twice
        return !assignedPerspectives.includes(agentPerspective);
    }
    /**
     * Calculate vote weight based on perspective and evidence
     */
    calculateVoteWeight(sessionId, vote, evidence) {
        const perspective = this.perspectiveAssignments.get(sessionId);
        if (!perspective)
            return 1.0;
        let weight = 1.0;
        // Boost weight for underrepresented perspectives
        const allPerspectives = Array.from(this.perspectiveAssignments.values());
        const perspectiveCount = allPerspectives.filter(p => p === perspective).length;
        if (perspectiveCount === 1) {
            weight *= 1.5; // Unique perspective bonus
        }
        // Evidence bonus
        if (evidence && evidence.length > 0) {
            weight *= 1.2;
        }
        // Analytical perspectives get bonus for data-heavy decisions
        if (perspective === types_1.PerspectiveProfile.ANALYTICAL && evidence && evidence.length > 2) {
            weight *= 1.1;
        }
        // Skeptics get bonus for identifying risks
        if (perspective === types_1.PerspectiveProfile.SKEPTIC && vote.risks?.length > 0) {
            weight *= 1.1;
        }
        return weight;
    }
    /**
     * Resolve conflict using diversity-weighted consensus
     */
    async resolveConflict(conflicts) {
        // Group conflicts by perspective
        const perspectiveGroups = new Map();
        conflicts.forEach(conflict => {
            const perspective = this.perspectiveAssignments.get(conflict.sessionId);
            if (perspective) {
                const group = perspectiveGroups.get(perspective) || [];
                group.push(conflict);
                perspectiveGroups.set(perspective, group);
            }
        });
        // Weight perspectives
        let bestEdit = null;
        let bestScore = 0;
        const perspectivesConsidered = [];
        perspectiveGroups.forEach((edits, perspective) => {
            perspectivesConsidered.push(perspective);
            // Calculate perspective weight
            const diversityBonus = 1 + (0.2 * perspectiveGroups.size);
            const weight = this.getPerspectiveWeight(perspective) * diversityBonus;
            edits.forEach(edit => {
                const score = weight * (edit.confidence || 1);
                if (score > bestScore) {
                    bestScore = score;
                    bestEdit = edit;
                }
            });
        });
        return {
            edit: bestEdit?.edit || conflicts[0].edit,
            confidence: Math.min(0.95, bestScore / conflicts.length),
            method: 'diversity-weighted-consensus',
            perspectivesConsidered
        };
    }
    /**
     * Resolve decision with diversity weighting
     */
    async resolveDecision(votes) {
        const voteGroups = new Map();
        // Group and weight votes
        votes.forEach(vote => {
            const key = JSON.stringify(vote.vote);
            const group = voteGroups.get(key) || {
                count: 0,
                weight: 0,
                perspectives: new Set(),
                evidence: 0
            };
            const perspective = this.perspectiveAssignments.get(vote.sessionId);
            if (perspective) {
                group.perspectives.add(perspective);
            }
            group.count++;
            group.weight += vote.weight || 1;
            group.evidence += vote.evidence ? 1 : 0;
            voteGroups.set(key, group);
        });
        // Find best choice
        let bestChoice = null;
        let bestScore = 0;
        let bestGroup = null;
        voteGroups.forEach((group, choiceKey) => {
            // Score based on weight and diversity
            const diversityBonus = group.perspectives.size / Object.values(types_1.PerspectiveProfile).length;
            const evidenceBonus = group.evidence / group.count;
            const score = group.weight * (1 + diversityBonus * 0.5 + evidenceBonus * 0.3);
            if (score > bestScore) {
                bestScore = score;
                bestChoice = JSON.parse(choiceKey);
                bestGroup = group;
            }
        });
        // Calculate metrics
        const totalPerspectives = new Set();
        votes.forEach(v => {
            const p = this.perspectiveAssignments.get(v.sessionId);
            if (p)
                totalPerspectives.add(p);
        });
        return {
            choice: bestChoice,
            confidence: Math.min(0.95, bestScore / votes.length),
            diversityScore: totalPerspectives.size / Object.values(types_1.PerspectiveProfile).length,
            perspectivesRepresented: bestGroup ? Array.from(bestGroup.perspectives) : []
        };
    }
    /**
     * Record agent contribution
     */
    recordContribution(sessionId, message) {
        const perspective = this.perspectiveAssignments.get(sessionId);
        if (!perspective)
            return;
        // Analyze contribution
        const analysis = this.analyzer.analyzeStatement(sessionId, message.content || message.text || '');
        // Record in tracker
        this.tracker.recordDecision(sessionId, message.type, perspective.toString(), analysis.isEchoing, !!message.evidence, analysis.diversityContribution > 0.7);
    }
    /**
     * Get current diversity metrics
     */
    getMetrics() {
        const baseMetrics = this.tracker.getDiversityMetrics();
        const enforcerMetrics = this.enforcer.getMetrics();
        return {
            ...baseMetrics,
            interventions: enforcerMetrics.interventions
        };
    }
    /**
     * Remove agent on disconnect
     */
    removeAgent(sessionId) {
        this.perspectiveAssignments.delete(sessionId);
        // Tracker keeps historical data
    }
    /**
     * Get active perspectives
     */
    getActivePerspectives() {
        return Array.from(this.perspectiveAssignments.values());
    }
    /**
     * Save metrics for learning
     */
    async saveMetrics() {
        const metrics = this.getMetrics();
        const timestamp = new Date().toISOString();
        // In real implementation, save to database
        console.log(`Saving diversity metrics at ${timestamp}:`, metrics);
    }
    // Private helper methods
    calculateDistribution(perspectives) {
        const distribution = new Map();
        Object.values(types_1.PerspectiveProfile).forEach(p => {
            distribution.set(p, 0);
        });
        perspectives.forEach(p => {
            distribution.set(p, (distribution.get(p) || 0) + 1);
        });
        return distribution;
    }
    selectUnderrepresented(distribution) {
        let minCount = Infinity;
        let selected = types_1.PerspectiveProfile.PRAGMATIST;
        distribution.forEach((count, perspective) => {
            if (count < minCount) {
                minCount = count;
                selected = perspective;
            }
        });
        return selected;
    }
    findComplementaryPerspective(distribution) {
        // Find what's missing for balance
        const total = Array.from(distribution.values()).reduce((a, b) => a + b, 0);
        // If too many optimists, add skeptics
        if (distribution.get(types_1.PerspectiveProfile.OPTIMIST) > total * 0.3) {
            return types_1.PerspectiveProfile.SKEPTIC;
        }
        // If too many innovators, add conservatives
        if (distribution.get(types_1.PerspectiveProfile.INNOVATOR) > total * 0.3) {
            return types_1.PerspectiveProfile.CONSERVATIVE;
        }
        // Otherwise select underrepresented
        return this.selectUnderrepresented(distribution);
    }
    getPerspectiveWeight(perspective) {
        // Base weights for different perspectives
        const weights = {
            [types_1.PerspectiveProfile.SKEPTIC]: 1.2,
            [types_1.PerspectiveProfile.ANALYTICAL]: 1.1,
            [types_1.PerspectiveProfile.CONSERVATIVE]: 1.1,
            [types_1.PerspectiveProfile.PRAGMATIST]: 1.0,
            [types_1.PerspectiveProfile.OPTIMIST]: 0.9,
            [types_1.PerspectiveProfile.INNOVATOR]: 1.0,
            [types_1.PerspectiveProfile.CREATIVE]: 0.9,
            [types_1.PerspectiveProfile.DETAIL_ORIENTED]: 1.1,
            [types_1.PerspectiveProfile.BIG_PICTURE]: 1.0
        };
        return weights[perspective] || 1.0;
    }
    async getTaskAssignments(taskId) {
        // In real implementation, query task assignments
        // For now, return empty
        return [];
    }
}
exports.DiversityMiddleware = DiversityMiddleware;
//# sourceMappingURL=middleware.js.map