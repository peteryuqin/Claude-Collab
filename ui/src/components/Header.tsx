import { ConnectionStatus } from '../types/claude-collab'
import clsx from 'clsx'

interface HeaderProps {
  connectionStatus: ConnectionStatus
}

export function Header({ connectionStatus }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎵 Claude-Collab
          </h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            v3.2.3
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <ConnectionIndicator status={connectionStatus} />
        </div>
      </div>
    </header>
  )
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const statusConfig = {
    connecting: { color: 'bg-yellow-500', text: 'Connecting...', pulse: true },
    connected: { color: 'bg-green-500', text: 'Connected', pulse: false },
    disconnected: { color: 'bg-red-500', text: 'Disconnected', pulse: false },
    error: { color: 'bg-red-500', text: 'Error', pulse: true },
    reconnecting: { color: 'bg-yellow-500', text: 'Reconnecting...', pulse: true }
  }
  
  const config = statusConfig[status]
  
  return (
    <div className="flex items-center space-x-2">
      <div className={clsx(
        'w-3 h-3 rounded-full',
        config.color,
        config.pulse && 'animate-pulse'
      )} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {config.text}
      </span>
    </div>
  )
}