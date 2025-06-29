import { useState, useEffect } from 'react'
import type { Agent } from '../types/claude-collab'

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  
  const updateAgent = (agent: Agent) => {
    setAgents(prev => {
      const index = prev.findIndex(a => a.id === agent.id)
      if (index >= 0) {
        const updated = [...prev]
        updated[index] = agent
        return updated
      }
      return [...prev, agent]
    })
  }
  
  const removeAgent = (agentId: string) => {
    setAgents(prev => prev.filter(a => a.id !== agentId))
  }
  
  const getAgentById = (agentId: string) => {
    return agents.find(a => a.id === agentId)
  }
  
  return {
    agents,
    setAgents,
    updateAgent,
    removeAgent,
    getAgentById
  }
}