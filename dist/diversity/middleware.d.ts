/**
 * Claude-Collab v3.0.0 - Diversity Middleware
 * Integrates Anti-Echo-Chamber system into real-time collaboration
 */
import { EventEmitter } from 'events';
import { PerspectiveProfile, DiversityConfig, DiversityMetrics } from './types';
export interface MessageContext {
    sessionId: string;
    content: string;
    type: string;
    evidence?: any[];
    targetClaim?: string;
}
export interface DiversityCheckResult {
    allowed: boolean;
    reason?: string;
    requiredAction?: string;
    suggestions?: string[];
    diversityScore?: number;
}
export interface ConflictResolution {
    edit: any;
    confidence: number;
    method: string;
    perspectivesConsidered: string[];
}
export interface DecisionResult {
    choice: any;
    confidence: number;
    diversityScore: number;
    perspectivesRepresented: string[];
}
export declare class DiversityMiddleware extends EventEmitter {
    private tracker;
    private analyzer;
    private enforcer;
    private config;
    private requirements;
    private perspectiveAssignments;
    constructor(config?: Partial<DiversityConfig>);
    /**
     * Check if a message meets diversity requirements
     */
    checkMessage(context: MessageContext): Promise<DiversityCheckResult>;
    /**
     * Assign perspective to new agent
     */
    assignPerspective(sessionId: string): PerspectiveProfile;
    /**
     * Assign complementary perspective to balance team
     */
    assignComplementaryPerspective(currentPerspectives: PerspectiveProfile[]): PerspectiveProfile;
    /**
     * Get required perspectives for task type
     */
    getRequiredPerspectives(taskType: string): PerspectiveProfile[];
    /**
     * Check if agent can claim task based on perspective
     */
    canClaimTask(sessionId: string, taskId: string): Promise<boolean>;
    /**
     * Calculate vote weight based on perspective and evidence
     */
    calculateVoteWeight(sessionId: string, vote: any, evidence?: any[]): number;
    /**
     * Resolve conflict using diversity-weighted consensus
     */
    resolveConflict(conflicts: any[]): Promise<ConflictResolution>;
    /**
     * Resolve decision with diversity weighting
     */
    resolveDecision(votes: any[]): Promise<DecisionResult>;
    /**
     * Record agent contribution
     */
    recordContribution(sessionId: string, message: any): void;
    /**
     * Get current diversity metrics
     */
    getMetrics(): DiversityMetrics & {
        interventions: number;
    };
    /**
     * Remove agent on disconnect
     */
    removeAgent(sessionId: string): void;
    /**
     * Get active perspectives
     */
    getActivePerspectives(): PerspectiveProfile[];
    /**
     * Save metrics for learning
     */
    saveMetrics(): Promise<void>;
    private calculateDistribution;
    private selectUnderrepresented;
    private findComplementaryPerspective;
    private getPerspectiveWeight;
    private getTaskAssignments;
}
//# sourceMappingURL=middleware.d.ts.map