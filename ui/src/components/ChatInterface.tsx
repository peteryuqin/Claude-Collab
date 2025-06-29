import { Message } from '../types/claude-collab'
import clsx from 'clsx'

interface ChatInterfaceProps {
  messages: Message[]
  fullHeight?: boolean
}

export function ChatInterface({ messages, fullHeight }: ChatInterfaceProps) {
  return (
    <div className={clsx(
      'flex flex-col',
      fullHeight ? 'h-[calc(100vh-200px)]' : 'h-96'
    )}>
      <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageItem key={index} message={message} />
          ))
        )}
      </div>
    </div>
  )
}

function MessageItem({ message }: { message: Message }) {
  const typeStyles = {
    chat: 'bg-white dark:bg-gray-800',
    system: 'bg-blue-50 dark:bg-blue-900/20',
    'diversity-intervention': 'bg-red-50 dark:bg-red-900/20',
    'task-update': 'bg-yellow-50 dark:bg-yellow-900/20'
  }

  const time = new Date(message.timestamp).toLocaleTimeString()

  return (
    <div className={clsx(
      'p-3 rounded-lg',
      typeStyles[message.type] || 'bg-white dark:bg-gray-800'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">
              {message.displayName || 'System'}
            </span>
            {message.role && (
              <span className="text-xs text-purple-600 dark:text-purple-400">
                [{message.role}]
              </span>
            )}
            {message.perspective && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                ({message.perspective})
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {message.text}
          </p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {time}
        </span>
      </div>
    </div>
  )
}