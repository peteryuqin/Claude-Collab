/**
 * Claude-Collab v3.0.0 - Diversity Middleware
 * Integrates Anti-Echo-Chamber system into real-time collaboration
 */

import { EventEmitter } from 'events';
import { DiversityTracker } from './diversity-tracker';
import { PerspectiveAnalyzer } from './perspective-analyzer';
import { DiversityEnforcer } from './diversity-enforcer';
import {
  PerspectiveProfile,
  DiversityConfig,
  DiversityRequirement,
  DiversityMetrics
} from './types';

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

export class DiversityMiddleware extends EventEmitter {
  private tracker: DiversityTracker;
  private analyzer: PerspectiveAnalyzer;
  private enforcer: DiversityEnforcer;
  private config: DiversityConfig;
  private requirements: DiversityRequirement;
  private perspectiveAssignments: Map<string, PerspectiveProfile> = new Map();

  constructor(config?: Partial<DiversityConfig>) {
    super();
    
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
      requiredPerspectives: [PerspectiveProfile.SKEPTIC, PerspectiveProfile.ANALYTICAL],
      disagreementQuota: config?.disagreementQuota || 0.3,
      evidenceThreshold: config?.evidenceThreshold || 0.5,
      perspectiveRotationInterval: 30
    };

    this.tracker = new DiversityTracker(this.config);
    this.analyzer = new PerspectiveAnalyzer();
    this.enforcer = new DiversityEnforcer(this.config, this.requirements, this.tracker, this.analyzer);
  }

  /**
   * Check if a message meets diversity requirements
   */
  async checkMessage(context: MessageContext): Promise<DiversityCheckResult> {
    // Get active agents for context
    const activeAgents = Array.from(this.perspectiveAssignments.keys())
      .filter(id => id !== context.sessionId);

    // Enforce diversity
    const enforcementResult = await this.enforcer.enforceContribution({
      agentId: context.sessionId,
      content: context.content,
      messageType: context.type as any,
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
  assignPerspective(sessionId: string): PerspectiveProfile {
    // Get current distribution
    const currentPerspectives = Array.from(this.perspectiveAssignments.values());
    const distribution = this.calculateDistribution(currentPerspectives);
    
    // Find underrepresented perspective
    let assigned: PerspectiveProfile;
    
    if (currentPerspectives.length < this.requirements.requiredPerspectives.length) {
      // Assign required perspectives first
      const missing = this.requirements.requiredPerspectives.find(p => 
        !currentPerspectives.includes(p)
      );
      assigned = missing || this.selectUnderrepresented(distribution);
    } else {
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
  assignComplementaryPerspective(currentPerspectives: PerspectiveProfile[]): PerspectiveProfile {
    const distribution = this.calculateDistribution(currentPerspectives);
    
    // Find the most needed perspective
    const complementary = this.findComplementaryPerspective(distribution);
    
    return complementary;
  }

  /**
   * Get required perspectives for task type
   */
  getRequiredPerspectives(taskType: string): PerspectiveProfile[] {
    const taskPerspectives: Record<string, PerspectiveProfile[]> = {
      'decision': [PerspectiveProfile.SKEPTIC, PerspectiveProfile.ANALYTICAL],
      'brainstorm': [PerspectiveProfile.INNOVATOR, PerspectiveProfile.CREATIVE],
      'review': [PerspectiveProfile.SKEPTIC, PerspectiveProfile.DETAIL_ORIENTED],
      'planning': [PerspectiveProfile.PRAGMATIST, PerspectiveProfile.BIG_PICTURE],
      'analysis': [PerspectiveProfile.ANALYTICAL, PerspectiveProfile.SKEPTIC]
    };

    return taskPerspectives[taskType] || [PerspectiveProfile.PRAGMATIST];
  }

  /**
   * Check if agent can claim task based on perspective
   */
  async canClaimTask(sessionId: string, taskId: string): Promise<boolean> {
    const agentPerspective = this.perspectiveAssignments.get(sessionId);
    if (!agentPerspective) return false;

    // In a real implementation, would check task requirements
    // For now, ensure diverse task assignment
    const assignedAgents = await this.getTaskAssignments(taskId);
    const assignedPerspectives = assignedAgents.map(id => 
      this.perspectiveAssignments.get(id)
    ).filter(p => p !== undefined);

    // Don't allow same perspective twice
    return !assignedPerspectives.includes(agentPerspective);
  }

  /**
   * Calculate vote weight based on perspective and evidence
   */
  calculateVoteWeight(sessionId: string, vote: any, evidence?: any[]): number {
    const perspective = this.perspectiveAssignments.get(sessionId);
    if (!perspective) return 1.0;

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
    if (perspective === PerspectiveProfile.ANALYTICAL && evidence && evidence.length > 2) {
      weight *= 1.1;
    }

    // Skeptics get bonus for identifying risks
    if (perspective === PerspectiveProfile.SKEPTIC && vote.risks?.length > 0) {
      weight *= 1.1;
    }

    return weight;
  }

  /**
   * Resolve conflict using diversity-weighted consensus
   */
  async resolveConflict(conflicts: any[]): Promise<ConflictResolution> {
    // Group conflicts by perspective
    const perspectiveGroups = new Map<PerspectiveProfile, any[]>();
    
    conflicts.forEach(conflict => {
      const perspective = this.perspectiveAssignments.get(conflict.sessionId);
      if (perspective) {
        const group = perspectiveGroups.get(perspective) || [];
        group.push(conflict);
        perspectiveGroups.set(perspective, group);
      }
    });

    // Weight perspectives
    let bestEdit: any = null;
    let bestScore = 0;
    const perspectivesConsidered: string[] = [];

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
  async resolveDecision(votes: any[]): Promise<DecisionResult> {
    const voteGroups = new Map<string, {
      count: number;
      weight: number;
      perspectives: Set<PerspectiveProfile>;
      evidence: number;
    }>();

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
    let bestGroup: any = null;

    voteGroups.forEach((group, choiceKey) => {
      // Score based on weight and diversity
      const diversityBonus = group.perspectives.size / Object.values(PerspectiveProfile).length;
      const evidenceBonus = group.evidence / group.count;
      const score = group.weight * (1 + diversityBonus * 0.5 + evidenceBonus * 0.3);

      if (score > bestScore) {
        bestScore = score;
        bestChoice = JSON.parse(choiceKey);
        bestGroup = group;
      }
    });

    // Calculate metrics
    const totalPerspectives = new Set<PerspectiveProfile>();
    votes.forEach(v => {
      const p = this.perspectiveAssignments.get(v.sessionId);
      if (p) totalPerspectives.add(p);
    });

    return {
      choice: bestChoice,
      confidence: Math.min(0.95, bestScore / votes.length),
      diversityScore: totalPerspectives.size / Object.values(PerspectiveProfile).length,
      perspectivesRepresented: bestGroup ? Array.from(bestGroup.perspectives) : []
    };
  }

  /**
   * Record agent contribution
   */
  recordContribution(sessionId: string, message: any): void {
    const perspective = this.perspectiveAssignments.get(sessionId);
    if (!perspective) return;

    // Analyze contribution
    const analysis = this.analyzer.analyzeStatement(
      sessionId,
      message.content || message.text || ''
    );

    // Record in tracker
    this.tracker.recordDecision(
      sessionId,
      message.type,
      perspective.toString(),
      analysis.isEchoing,
      !!message.evidence,
      analysis.diversityContribution > 0.7
    );
  }

  /**
   * Get current diversity metrics
   */
  getMetrics(): DiversityMetrics & { interventions: number } {
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
  removeAgent(sessionId: string): void {
    this.perspectiveAssignments.delete(sessionId);
    // Tracker keeps historical data
  }

  /**
   * Get active perspectives
   */
  getActivePerspectives(): PerspectiveProfile[] {
    return Array.from(this.perspectiveAssignments.values());
  }

  /**
   * Save metrics for learning
   */
  async saveMetrics(): Promise<void> {
    const metrics = this.getMetrics();
    const timestamp = new Date().toISOString();
    
    // In real implementation, save to database
    console.log(`Saving diversity metrics at ${timestamp}:`, metrics);
  }

  // Private helper methods

  private calculateDistribution(perspectives: PerspectiveProfile[]): Map<PerspectiveProfile, number> {
    const distribution = new Map<PerspectiveProfile, number>();
    
    Object.values(PerspectiveProfile).forEach(p => {
      distribution.set(p, 0);
    });

    perspectives.forEach(p => {
      distribution.set(p, (distribution.get(p) || 0) + 1);
    });

    return distribution;
  }

  private selectUnderrepresented(distribution: Map<PerspectiveProfile, number>): PerspectiveProfile {
    let minCount = Infinity;
    let selected = PerspectiveProfile.PRAGMATIST;

    distribution.forEach((count, perspective) => {
      if (count < minCount) {
        minCount = count;
        selected = perspective;
      }
    });

    return selected;
  }

  private findComplementaryPerspective(distribution: Map<PerspectiveProfile, number>): PerspectiveProfile {
    // Find what's missing for balance
    const total = Array.from(distribution.values()).reduce((a, b) => a + b, 0);
    
    // If too many optimists, add skeptics
    if (distribution.get(PerspectiveProfile.OPTIMIST)! > total * 0.3) {
      return PerspectiveProfile.SKEPTIC;
    }

    // If too many innovators, add conservatives
    if (distribution.get(PerspectiveProfile.INNOVATOR)! > total * 0.3) {
      return PerspectiveProfile.CONSERVATIVE;
    }

    // Otherwise select underrepresented
    return this.selectUnderrepresented(distribution);
  }

  private getPerspectiveWeight(perspective: PerspectiveProfile): number {
    // Base weights for different perspectives
    const weights: Record<PerspectiveProfile, number> = {
      [PerspectiveProfile.SKEPTIC]: 1.2,
      [PerspectiveProfile.ANALYTICAL]: 1.1,
      [PerspectiveProfile.CONSERVATIVE]: 1.1,
      [PerspectiveProfile.PRAGMATIST]: 1.0,
      [PerspectiveProfile.OPTIMIST]: 0.9,
      [PerspectiveProfile.INNOVATOR]: 1.0,
      [PerspectiveProfile.CREATIVE]: 0.9,
      [PerspectiveProfile.DETAIL_ORIENTED]: 1.1,
      [PerspectiveProfile.BIG_PICTURE]: 1.0
    };

    return weights[perspective] || 1.0;
  }

  private async getTaskAssignments(taskId: string): Promise<string[]> {
    // In real implementation, query task assignments
    // For now, return empty
    return [];
  }
}