import { useEffect, useRef, useState, useCallback } from 'react'

// WebSocket connection status
const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
}

// WebSocket Hook
export function useWebSocket(url, options = {}) {
  const [status, setStatus] = useState(CONNECTION_STATUS.DISCONNECTED)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const { reconnectInterval = 5000, maxReconnectAttempts = 3 } = options

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setStatus(CONNECTION_STATUS.CONNECTING)
    setError(null)

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setStatus(CONNECTION_STATUS.CONNECTED)
        setError(null)
        console.log('WebSocket connected successfully')
      }

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data)
          setData(parsedData)

          // Handle different message types
          if (parsedData.type === 'notification') {
            // Trigger notification system
            showNotification(parsedData)
          } else if (parsedData.type === 'data_update') {
            // Handle data updates
            handleDataUpdate(parsedData)
          }
        } catch (error) {
          // If not JSON, store as raw data
          setData(event.data)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setStatus(CONNECTION_STATUS.ERROR)
        setError('Connection error occurred')
      }

      ws.onclose = () => {
        setStatus(CONNECTION_STATUS.DISCONNECTED)

        // Attempt reconnection if not manually closed
        if (reconnectTimeoutRef.current === null) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current = ws
    } catch (error) {
      setStatus(CONNECTION_STATUS.ERROR)
      setError(error.message)
    }
  }, [url, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus(CONNECTION_STATUS.DISCONNECTED)
  }, [])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    status,
    data,
    error,
    sendMessage,
    connect,
    disconnect,
    isConnected: status === CONNECTION_STATUS.CONNECTED
  }
}

// Real-time Dashboard Data Hook
export function useRealtimeDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Mock WebSocket for demo (in production, use real WebSocket URL)
  useEffect(() => {
    const updateInterval = setInterval(() => {
      // Simulate real-time dashboard updates
      const mockUpdate = {
        type: 'data_update',
        timestamp: new Date().toISOString(),
        investigation_metrics: {
          active_cases: Math.floor(Math.random() * 5) + 35,
          resolution_rate: (Math.random() * 2 + 3).toFixed(1),
          critical_cases: Math.floor(Math.random() * 3) + 8,
          analyst_workload: Math.floor(Math.random() * 3) + 10
        },
        kpis: [
          { id: 'active-cases', value: `${Math.floor(Math.random() * 5) + 35}`, trend: '+2.3%' },
          { id: 'resolution-rate', value: `${(Math.random() * 2 + 3).toFixed(1)}/hr`, trend: '+5.1%' },
          { id: 'critical-cases', value: Math.floor(Math.random() * 3) + 8, trend: '-1.2%' }
        ]
      }

      setDashboardData(mockUpdate)
      setLastUpdate(new Date())

      // Trigger notification for significant changes
      if (Math.random() > 0.7) {
        showNotification({
          type: 'investigation',
          title: 'Live Update',
          message: `Dashboard data updated at ${new Date().toLocaleTimeString()}`
        })
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(updateInterval)
  }, [])

  return { dashboardData, lastUpdate }
}

// WebSocket Status Indicator
export function WebSocketStatusIndicator({ status }) {
  const statusConfig = {
    connecting: { color: 'text-warning', text: 'Connecting...', dot: 'animate-pulse' },
    connected: { color: 'text-success', text: 'Connected', dot: 'animate-pulse' },
    disconnected: { color: 'text-muted', text: 'Disconnected', dot: '' },
    error: { color: 'text-danger', text: 'Error', dot: 'animate-pulse' }
  }

  const config = statusConfig[status] || statusConfig.disconnected

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full bg-current ${config.dot}`}></div>
      <span className={`${config.color} font-medium`}>{config.text}</span>
    </div>
  )
}

// Real-time Case Updates Hook
export function useRealtimeCases() {
  const [cases, setCases] = useState([])
  const [updates, setUpdates] = useState([])

  useEffect(() => {
    // Simulate real-time case updates
    const updateInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        const updateTypes = [
          'status_change',
          'priority_update',
          'new_evidence',
          'analyst_assignment',
          'resolution'
        ]

        const mockUpdate = {
          id: Date.now(),
          type: updateTypes[Math.floor(Math.random() * updateTypes.length)],
          timestamp: new Date().toISOString(),
          caseId: `MDE-${24000 + Math.floor(Math.random() * 100)}`,
          message: getRandomUpdateMessage(),
          analyst: `Analyst ${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}`
        }

        setUpdates(prev => [mockUpdate, ...prev].slice(0, 10))

        // Show notification for important updates
        if (['priority_update', 'resolution'].includes(mockUpdate.type)) {
          showNotification({
            type: mockUpdate.type === 'resolution' ? 'success' : 'warning',
            title: `Case ${mockUpdate.caseId} Updated`,
            message: mockUpdate.message,
            metadata: {
              Type: mockUpdate.type,
              Analyst: mockUpdate.analyst
            }
          })
        }
      }
    }, 8000)

    return () => clearInterval(updateInterval)
  }, [])

  return { cases, updates }
}

// Helper function for random update messages
function getRandomUpdateMessage() {
  const messages = [
    'Status changed to Under Review',
    'Priority escalated to High',
    'New evidence discovered',
    'Assigned to senior analyst',
    'Case resolved successfully',
    'Additional transactions flagged',
    'Risk score updated',
    'Evidence collection completed',
    'Witness statement added',
    'Regulatory body notified'
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

// Notification helper (integrates with notification system)
function showNotification(notification) {
  // This would integrate with your notification system
  if (window.dispatchEvent) {
    const event = new CustomEvent('notification', { detail: notification })
    window.dispatchEvent(event)
  }
}

// Real-time Threat Detection Hook
export function useRealtimeThreatDetection() {
  const [threats, setThreats] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)

    // Simulate threat detection
    const monitorInterval = setInterval(() => {
      if (Math.random() > 0.9) {
        const newThreat = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          level: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
          source: 'ML Model',
          confidence: (Math.random() * 20 + 80).toFixed(1),
          description: getRandomThreatDescription(),
          accountId: `MLACC${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`
        }

        setThreats(prev => [newThreat, ...prev].slice(0, 20))

        // Show notification for critical threats
        if (newThreat.level === 'Critical') {
          showNotification({
            type: 'danger',
            title: '🚨 Critical Threat Detected',
            message: newThreat.description,
            metadata: {
              Account: newThreat.accountId,
              Confidence: newThreat.confidence + '%'
            }
          })
        }
      }
    }, 10000)

    return () => clearInterval(monitorInterval)
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
  }, [])

  return { threats, isMonitoring, startMonitoring, stopMonitoring }
}

function getRandomThreatDescription() {
  const descriptions = [
    'Unusual structuring pattern detected',
    'High-velocity transaction sequence',
    'Suspicious cross-border activity',
    'Round-tripping transaction pattern',
    'Layering behavior identified',
    'Uncharacteristic account activity',
    'Potential smurfing detected',
    'Anonymous transaction spike'
  ]
  return descriptions[Math.floor(Math.random() * descriptions.length)]
}

// WebSocket Connection Manager
export class WebSocketManager {
  constructor() {
    this.connections = new Map()
    this.reconnectAttempts = new Map()
  }

  connect(url, options = {}) {
    if (this.connections.has(url)) {
      return this.connections.get(url)
    }

    const ws = new WebSocket(url)
    this.connections.set(url, ws)
    this.reconnectAttempts.set(url, 0)

    return ws
  }

  disconnect(url) {
    const ws = this.connections.get(url)
    if (ws) {
      ws.close()
      this.connections.delete(url)
      this.reconnectAttempts.delete(url)
    }
  }

  broadcast(url, message) {
    const ws = this.connections.get(url)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(typeof message === 'string' ? message : JSON.stringify(message))
    }
  }

  getStatus(url) {
    const ws = this.connections.get(url)
    if (!ws) return 'disconnected'

    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
        return 'closing'
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'unknown'
    }
  }

  getConnectionCount() {
    return this.connections.size
  }
}

// Global WebSocket manager instance
export const wsManager = new WebSocketManager()

// Real-time Performance Monitoring
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    messageLatency: 0,
    updateFrequency: 0,
    errorRate: 0
  })

  useEffect(() => {
    const startTime = Date.now()
    let updateCount = 0
    let errorCount = 0

    const monitoringInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      updateCount++

      setMetrics({
        messageLatency: Math.random() * 100 + 50, // Simulated latency
        updateFrequency: elapsed > 0 ? (updateCount / (elapsed / 1000)).toFixed(2) : 0,
        errorRate: updateCount > 0 ? (errorCount / updateCount * 100).toFixed(1) : 0
      })
    }, 5000)

    return () => clearInterval(monitoringInterval)
  }, [])

  return { metrics }
}