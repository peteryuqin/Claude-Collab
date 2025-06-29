import { Agent } from '../types/claude-collab'
import clsx from 'clsx'

interface AgentGridProps {
  agents: Agent[]
}

export function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No active agents
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-gray-500',
    busy: 'bg-yellow-500',
    disconnected: 'bg-red-500'
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {agent.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {agent.role}
          </p>
          {agent.perspective && (
            <p className="text-xs text-primary mt-1">
              {agent.perspective}
            </p>
          )}
        </div>
        <div className={clsx(
          'w-3 h-3 rounded-full',
          statusColors[agent.status] || 'bg-gray-500'
        )} />
      </div>
      
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        ID: {agent.agentId.slice(0, 8)}...
      </div>
    </div>
  )
}