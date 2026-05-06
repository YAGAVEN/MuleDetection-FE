import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/**
 * MuleNetworkView – D3 force-directed graph showing transaction network
 * for a given account. Props: networkData (from /api/mule/network-metrics)
 */
export default function MuleNetworkView({ accountId, networkData }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!networkData || !svgRef.current) return

    const width = svgRef.current.clientWidth || 600
    const height = 400
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Build simple synthetic graph from network metrics
    const connectedCount = networkData.connected_accounts ?? 6
    const nodes = [{ id: accountId, type: 'target' }]
    const links = []

    for (let i = 0; i < connectedCount; i++) {
      const nodeId = `ACC_${String(i).padStart(3, '0')}`
      nodes.push({ id: nodeId, type: 'peer' })
      links.push({ source: accountId, target: nodeId })
    }

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#00ff8740')
      .attr('stroke-width', 1.5)

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => (d.type === 'target' ? 14 : 7))
      .attr('fill', (d) => (d.type === 'target' ? '#00ff87' : '#00d4ff60'))
      .attr('stroke', (d) => (d.type === 'target' ? '#fff' : '#00d4ff'))
      .attr('stroke-width', 1.5)
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )

    const label = svg
      .append('g')
      .selectAll('text')
      .data(nodes.filter((d) => d.type === 'target'))
      .enter()
      .append('text')
      .text((d) => d.id)
      .attr('font-size', 10)
      .attr('fill', '#fff')
      .attr('text-anchor', 'middle')
      .attr('dy', 24)

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      label.attr('x', (d) => d.x).attr('y', (d) => d.y)
    })

    return () => simulation.stop()
  }, [accountId, networkData])

  return (
    <div className="bg-[#0d0d1a] border border-[#00ff87]/20 rounded-2xl p-4">
      <h3 className="text-[#00ff87] font-semibold mb-3 text-sm uppercase tracking-wider">
        Transaction Network Graph
      </h3>
      {networkData ? (
        <svg ref={svgRef} className="w-full" style={{ height: 400 }} />
      ) : (
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          Enter an Account ID and click Analyse
        </div>
      )}
    </div>
  )
}
