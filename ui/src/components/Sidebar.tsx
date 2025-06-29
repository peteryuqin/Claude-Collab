import clsx from 'clsx'

interface SidebarProps {
  activeView: string
  onViewChange: (view: 'overview' | 'chat' | 'metrics') => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'chat', label: 'Live Chat', icon: '💬' },
    { id: 'metrics', label: 'Metrics', icon: '📊' },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as any)}
            className={clsx(
              'w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center space-x-3',
              activeView === item.id
                ? 'bg-primary text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}