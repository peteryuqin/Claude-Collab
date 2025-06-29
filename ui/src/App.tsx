import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { AgentGrid } from './components/AgentGrid'
import { ChatInterface } from './components/ChatInterface'
import { MetricsChart } from './components/MetricsChart'
import { useWebSocket } from './hooks/useWebSocket'
import { useAgents } from './hooks/useAgents'
import type { Agent, Message, Metrics } from './types/claude-collab'

function App() {
  const [activeView, setActiveView] = useState<'overview' | 'chat' | 'metrics'>('overview')
  const [agents, setAgents] = useState<Agent[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    overallDiversity: 0,
    agreementRate: 0,
    evidenceRate: 0,
    activeAgents: 0,
    messagesPerMinute: 0
  })

  const { isConnected, connectionStatus } = useWebSocket({
    onMessage: (data) => {
      switch (data.type) {
        case 'agent-list':
          setAgents(data.agents)
          break
        case 'chat':
          setMessages(prev => [...prev, data as Message])
          break
        case 'diversity-metrics':
          setMetrics(data.metrics)
          break
        case 'session-update':
          // Handle agent join/leave
          if (data.event === 'joined') {
            setAgents(prev => [...prev, data.session])
          } else if (data.event === 'left') {
            setAgents(prev => prev.filter(a => a.id !== data.session.id))
          }
          break
      }
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header connectionStatus={connectionStatus} />
      
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        
        <main className="flex-1 p-6 overflow-auto">
          {activeView === 'overview' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Claude-Collab Dashboard
              </h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="dashboard-card">
                  <h2 className="text-xl font-semibold mb-4">Active Agents</h2>
                  <AgentGrid agents={agents} />
                </div>
                
                <div className="dashboard-card">
                  <h2 className="text-xl font-semibold mb-4">Diversity Metrics</h2>
                  <MetricsChart metrics={metrics} />
                </div>
              </div>
              
              <div className="dashboard-card">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <ChatInterface messages={messages.slice(-10)} />
              </div>
            </div>
          )}
          
          {activeView === 'chat' && (
            <div className="dashboard-card h-full">
              <h2 className="text-xl font-semibold mb-4">Live Chat</h2>
              <ChatInterface messages={messages} fullHeight />
            </div>
          )}
          
          {activeView === 'metrics' && (
            <div className="dashboard-card">
              <h2 className="text-xl font-semibold mb-4">Detailed Metrics</h2>
              <MetricsChart metrics={metrics} detailed />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App