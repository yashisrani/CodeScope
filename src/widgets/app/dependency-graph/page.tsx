'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useCallback, useRef, useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

interface GraphNode {
  id: string;
  label: string;
  complexity: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface DepGraphData {
  mermaid: string;
  nodes: number;
  edges: number;
  graphData: GraphData;
}

interface Position { x: number; y: number; }

const NODE_W = 220;
const NODE_H = 40;
const LEVEL_GAP = 80;
const NODE_GAP = 20;

function getColor(complexity: number) {
  if (complexity < 10) return { fill: '#d5f5e3', stroke: '#27ae60', text: '#1a5c34' };
  if (complexity < 30) return { fill: '#fef9e7', stroke: '#f39c12', text: '#7d5e0a' };
  if (complexity < 50) return { fill: '#fdebd0', stroke: '#e67e22', text: '#6b3a0a' };
  return { fill: '#fadbd8', stroke: '#c0392b', text: '#6b1a1a' };
}

function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Position> {
  const positions = new Map<string, Position>();
  if (nodes.length === 0) return positions;

  const incoming = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodeSet = new Set(nodes.map(n => n.id));

  for (const n of nodes) {
    incoming.set(n.id, 0);
    adjacency.set(n.id, []);
  }
  for (const e of edges) {
    if (nodeSet.has(e.from) && nodeSet.has(e.to)) {
      adjacency.get(e.from)!.push(e.to);
      incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
    }
  }

  const layers: string[][] = [];
  const nodeLayer = new Map<string, number>();
  let queue = nodes.filter(n => (incoming.get(n.id) || 0) === 0).map(n => n.id);
  if (queue.length === 0) queue = [nodes[0].id];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const layer: string[] = [];
    const next: string[] = [];
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      layer.push(id);
      nodeLayer.set(id, layers.length);
      for (const neighbor of adjacency.get(id) || []) {
        if (!visited.has(neighbor)) next.push(neighbor);
      }
    }
    if (layer.length > 0) layers.push(layer);
    queue = next;
  }

  for (const n of nodes) {
    if (!nodeLayer.has(n.id)) {
      nodeLayer.set(n.id, layers.length);
      if (layers.length <= nodeLayer.get(n.id)!) layers.push([]);
      layers[nodeLayer.get(n.id)!].push(n.id);
    }
  }

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const totalW = layer.length * NODE_W + (layer.length - 1) * NODE_GAP;
    let x = -totalW / 2 + NODE_W / 2;
    for (const id of layer) {
      positions.set(id, { x, y: i * (NODE_H + LEVEL_GAP) });
      x += NODE_W + NODE_GAP;
    }
  }

  return positions;
}

export default function DependencyGraphView() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DepGraphData>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const edgeColor = isDark ? '#475569' : '#94a3b8';

  const graphData: GraphData = data?.graphData || { nodes: [], edges: [] };
  const positions = layoutGraph(graphData.nodes, graphData.edges);

  const sortedEdges = graphData.edges.filter(e => positions.has(e.from) && positions.has(e.to));
  const edgePaths = sortedEdges.map(e => {
    const from = positions.get(e.from)!;
    const to = positions.get(e.to)!;
    const midY = (from.y + to.y) / 2;
    return {
      key: `${e.from}-${e.to}`,
      d: `M${from.x},${from.y + NODE_H / 2} C${from.x},${midY} ${to.x},${midY} ${to.x},${to.y - NODE_H / 2}`,
    };
  });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (!isReady) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor }}>
        Initializing...
      </div>
    );
  }

  if (!data || graphData.nodes.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor }}>
        No data to display
      </div>
    );
  }

  const svgW = Math.max(800, graphData.nodes.length * 100);
  const svgH = Math.max(600, (Math.max(...graphData.nodes.map(n => positions.get(n.id)?.y || 0)) + NODE_H + 100));

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: bg,
      color: textColor,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      cursor: dragging ? 'grabbing' : 'grab',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 14,
        flexShrink: 0,
        background: isDark ? '#1e293b' : '#f8fafc',
      }}>
        <strong>Dependency Graph</strong>
        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          {graphData.nodes.length} files &middot; {graphData.edges.length} edges
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#d5f5e3', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Low</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fef9e7', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Med</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fdebd0', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>High</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fadbd8', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Critical</span>
          </span>
          <span style={{ fontSize: 12, color: isDark ? '#64748b' : '#94a3b8', marginLeft: 8 }}>
            Drag to pan &middot; Scroll to zoom &middot; Click node for details
          </span>
        </span>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ background: bg }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleBackgroundClick}
        >
          <g transform={`translate(${pan.x + svgW / 2}, ${pan.y + 60}) scale(${zoom})`}>
            {edgePaths.map(ep => (
              <path
                key={ep.key}
                d={ep.d}
                fill="none"
                stroke={edgeColor}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                markerEnd="url(#arrowhead)"
              />
            ))}
            {graphData.nodes.map(node => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const colors = getColor(node.complexity);
              const name = node.label.split('/').pop() || node.label;
              const isSelected = selectedNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x - NODE_W / 2}, ${pos.y - NODE_H / 2})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleNodeClick(node, e)}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    ry={6}
                    fill={colors.fill}
                    stroke={isSelected ? '#3b82f6' : colors.stroke}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text
                    x={NODE_W / 2}
                    y={NODE_H / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={colors.text}
                    fontSize={13}
                    fontFamily="system-ui, sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {name.length > 24 ? name.slice(0, 22) + '..' : name}
                  </text>
                </g>
              );
            })}
          </g>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={edgeColor} />
            </marker>
          </defs>
        </svg>

        {selectedNode && (
          <div style={{
            position: 'absolute',
            left: tooltipPos.x + 16,
            top: tooltipPos.y - 10,
            background: isDark ? '#1e293b' : '#f8fafc',
            border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 13,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10,
            pointerEvents: 'none',
            minWidth: 200,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: textColor }}>
              {selectedNode.label.split('/').pop()}
            </div>
            <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, marginBottom: 2 }}>
              Path: {selectedNode.label}
            </div>
            <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}>
              Complexity: <strong style={{ color: getColor(selectedNode.complexity).stroke }}>{selectedNode.complexity}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
