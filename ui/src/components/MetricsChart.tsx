import { Metrics } from '../types/claude-collab'
import { 
  RadialBarChart, 
  RadialBar, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import clsx from 'clsx'

interface MetricsChartProps {
  metrics: Metrics
  detailed?: boolean
}

export function MetricsChart({ metrics, detailed }: MetricsChartProps) {
  const diversityScore = Math.round(metrics.overallDiversity * 100)
  const agreementRate = Math.round(metrics.agreementRate * 100)
  const evidenceRate = Math.round(metrics.evidenceRate * 100)

  const radialData = [
    {
      name: 'Diversity',
      value: diversityScore,
      fill: diversityScore >= 60 ? '#10b981' : diversityScore >= 40 ? '#f59e0b' : '#ef4444'
    },
    {
      name: 'Evidence',
      value: evidenceRate,
      fill: evidenceRate >= 70 ? '#10b981' : evidenceRate >= 50 ? '#f59e0b' : '#ef4444'
    }
  ]

  const agreementData = [{
    name: 'Agreement',
    value: agreementRate,
    inverse: 100 - agreementRate
  }]

  if (!detailed) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Diversity"
          value={diversityScore}
          unit="%"
          status={diversityScore >= 60 ? 'good' : diversityScore >= 40 ? 'warning' : 'bad'}
        />
        <MetricCard
          label="Agreement"
          value={agreementRate}
          unit="%"
          status={agreementRate <= 70 ? 'good' : agreementRate <= 80 ? 'warning' : 'bad'}
          inverse
        />
        <MetricCard
          label="Evidence"
          value={evidenceRate}
          unit="%"
          status={evidenceRate >= 70 ? 'good' : evidenceRate >= 50 ? 'warning' : 'bad'}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="metric-card">
          <h3 className="text-lg font-semibold mb-4">Diversity & Evidence</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={radialData}>
              <RadialBar dataKey="value" cornerRadius={10} />
              <Legend />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        <div className="metric-card">
          <h3 className="text-lg font-semibold mb-4">Agreement Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agreementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" />
              <Bar dataKey="inverse" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Lower agreement = Better diversity
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Active Agents</h4>
          <p className="text-3xl font-bold text-primary">{metrics.activeAgents}</p>
        </div>
        <div className="metric-card">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Messages/min</h4>
          <p className="text-3xl font-bold text-secondary">{metrics.messagesPerMinute}</p>
        </div>
      </div>

      {getWarnings(metrics).length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Warnings
          </h4>
          <ul className="space-y-1">
            {getWarnings(metrics).map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function MetricCard({ 
  label, 
  value, 
  unit, 
  status,
  inverse = false 
}: { 
  label: string
  value: number
  unit: string
  status: 'good' | 'warning' | 'bad'
  inverse?: boolean
}) {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    bad: 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="metric-card text-center">
      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </h4>
      <p className={clsx('text-3xl font-bold mt-2', statusColors[status])}>
        {value}{unit}
      </p>
      {inverse && (
        <p className="text-xs text-gray-500 mt-1">Lower is better</p>
      )}
    </div>
  )
}

function getWarnings(metrics: Metrics): string[] {
  const warnings: string[] = []
  
  if (metrics.overallDiversity < 0.5) {
    warnings.push('Low diversity detected - echo chamber risk!')
  }
  
  if (metrics.agreementRate > 0.8) {
    warnings.push('High agreement rate - consider diverse perspectives')
  }
  
  if (metrics.evidenceRate < 0.3) {
    warnings.push('Low evidence rate - encourage fact-based discussions')
  }
  
  if (metrics.activeAgents < 2) {
    warnings.push('Too few agents for meaningful collaboration')
  }
  
  return warnings
}