export interface Agent {
  id: string
  agentId: string
  name: string
  role: string
  perspective?: string
  status: 'active' | 'idle' | 'busy' | 'disconnected'
  joinedAt: Date
}

export interface Message {
  type: 'chat' | 'system' | 'diversity-intervention' | 'task-update'
  sessionId?: string
  agentId?: string
  displayName?: string
  role?: string
  perspective?: string
  text: string
  timestamp: number
}

export interface Metrics {
  overallDiversity: number
  agreementRate: number
  evidenceRate: number
  activeAgents: number
  messagesPerMinute: number
  perspectiveDistribution?: Record<string, number>
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

export interface DashboardData {
  type: string
  agents?: Agent[]
  metrics?: Metrics
  message?: Message
  [key: string]: any
}