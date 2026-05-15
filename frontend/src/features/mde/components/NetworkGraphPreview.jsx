import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'
import GlassCard from './GlassCard'
import { useMDEStore } from '../store/useMDEStore'

const riskNodeStyle = (risk) => {
  if (risk === 'critical') return { border: '1px solid rgba(244,63,94,0.9)', color: '#fecdd3', background: 'rgba(159,18,57,0.2)', boxShadow: '0 0 16px rgba(244,63,94,0.35)' }
  if (risk === 'high') return { border: '1px solid rgba(34,211,238,0.9)', color: '#cffafe', background: 'rgba(8,47,73,0.35)', boxShadow: '0 0 16px rgba(34,211,238,0.25)' }
  return { border: '1px solid rgba(167,139,250,0.85)', color: '#ddd6fe', background: 'rgba(76,29,149,0.2)', boxShadow: '0 0 14px rgba(167,139,250,0.25)' }
}

export default function NetworkGraphPreview() {
  const nodes = useMDEStore((s) => s.networkNodes).map((node) => ({
    ...node,
    style: {
      borderRadius: 14,
      padding: '8px 10px',
      fontSize: 11,
      ...riskNodeStyle(node.data.risk),
    },
  }))
  const edges = useMDEStore((s) => s.networkEdges).map((edge) => ({
    ...edge,
    style: { stroke: '#22d3ee', strokeWidth: 1.6 },
  }))

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Network Graph Intelligence</h3>
        <div className="text-xs text-cyan-200 bg-cyan-500/10 border border-cyan-300/30 px-2 py-1 rounded-lg">
          Suspicious clusters highlighted
        </div>
      </div>
      <div className="h-[290px] rounded-xl border border-white/10 overflow-hidden bg-[linear-gradient(transparent_24px,#0f172a_25px),linear-gradient(90deg,transparent_24px,#0f172a_25px)] bg-[size:25px_25px]">
        <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <MiniMap zoomable pannable nodeColor="#22d3ee" />
          <Controls />
          <Background color="#1e293b" gap={25} />
        </ReactFlow>
      </div>
    </GlassCard>
  )
}
