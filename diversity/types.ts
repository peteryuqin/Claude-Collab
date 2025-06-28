/**
 * Claude-Collab v3.0.0 - Diversity Type Definitions
 * Core types for the anti-echo-chamber system
 */

export enum PerspectiveProfile {
  OPTIMIST = 'OPTIMIST',
  SKEPTIC = 'SKEPTIC', 
  PRAGMATIST = 'PRAGMATIST',
  INNOVATOR = 'INNOVATOR',
  CONSERVATIVE = 'CONSERVATIVE',
  ANALYTICAL = 'ANALYTICAL',
  CREATIVE = 'CREATIVE',
  DETAIL_ORIENTED = 'DETAIL_ORIENTED',
  BIG_PICTURE = 'BIG_PICTURE'
}

export interface DiversityConfig {
  enabled: boolean;
  strictMode: boolean;
  autoRotation: boolean;
  learningEnabled: boolean;
  interventionThreshold: number;
  minimumAgentsForDiversity: number;
  minimumDiversity?: number;
  disagreementQuota?: number;
  evidenceThreshold?: number;
}

export interface DiversityRequirement {
  minimumDiversity: number;
  requiredPerspectives: PerspectiveProfile[];
  disagreementQuota: number;
  evidenceThreshold: number;
  perspectiveRotationInterval: number;
}

export interface DiversityMetrics {
  overallDiversity: number;
  perspectiveDistribution: Map<PerspectiveProfile, number>;
  agreementRate: number;
  evidenceRate: number;
  challengeRate: number;
  lastConsensusSpeed: number;
  minorityPerspectivesPreserved: number;
}

export interface PerspectiveScores {
  riskTolerance: number;
  innovationBias: number;
  evidencePreference: number;
  decisionSpeed: number;
  conflictTolerance: number;
}

export interface DiversityIntervention {
  type: 'FORCE_DISAGREEMENT' | 'REQUEST_EVIDENCE' | 'ROTATE_PERSPECTIVE' | 'ADD_PERSPECTIVE';
  reason: string;
  targetAgent: string;
  requiredAction: string;
  deadline: Date;
}

export interface AgentPerspective {
  agentId: string;
  profile: PerspectiveProfile;
  perspectiveScore: PerspectiveScores;
  history: PerspectiveHistory[];
  lastRotation: Date;
}

export interface PerspectiveHistory {
  timestamp: Date;
  decision: string;
  perspective: string;
  agreedWithMajority: boolean;
  evidenceProvided: boolean;
  challengedAssumptions: boolean;
}

export interface PerspectiveMessage {
  agentId: string;
  content: string;
  perspective: PerspectiveProfile;
  timestamp: Date;
  evidence?: EvidenceItem[];
}

export interface EvidenceItem {
  type: 'data' | 'study' | 'example' | 'metric';
  source: string;
  relevance: number;
  credibility: number;
}