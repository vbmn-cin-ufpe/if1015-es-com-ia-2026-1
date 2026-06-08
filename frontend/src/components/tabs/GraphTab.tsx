import { useState, useEffect, useRef } from "react"
import {
  getDependencyGraph,
  getModuleDetails,
  type GraphPayload,
  type GraphNode,
  type ModuleDetails,
} from "../../services/graphApi"
import { Card, ThinkingDots, EmptyState, ErrorBanner, btnSecondary, inputCls } from "../ui"

interface Props {
  repositoryId: string
  status: string
}

type NodePos = GraphNode & { x: number; y: number }

/** Color node box by in_degree (hubs are hot-colored, leaves are green) */
function nodeColor(inDegree: number, maxDegree: number) {
  const ratio = maxDegree > 0 ? inDegree / maxDegree : 0
  if (ratio > 0.6) return { bg: "#fee2e2", border: "#f87171", text: "#991b1b" }   // red
  if (ratio > 0.3) return { bg: "#ffedd5", border: "#fb923c", text: "#9a3412" }   // orange
  return { bg: "#dcfce7", border: "#4ade80", text: "#14532d" }                     // green
}

const BOX_W = 140
const BOX_H = 40
const H_SPACING = 180
const V_SPACING = 60

/** Lay nodes in a grid-like arrangement */
function layoutNodes(nodes: GraphNode[]): NodePos[] {
  const cols = Math.ceil(Math.sqrt(nodes.length))
  return nodes.map((n, i) => ({
    ...n,
    x: (i % cols) * H_SPACING + 20,
    y: Math.floor(i / cols) * V_SPACING + 20,
  }))
}

export function GraphTab({ repositoryId, status }: Props) {
  const [graph, setGraph]             = useState<GraphPayload | null>(null)
  const [positions, setPositions]     = useState<NodePos[]>([])
  const [selected, setSelected]       = useState<ModuleDetails | null>(null)
  const [filter, setFilter]           = useState("")
  const [loading, setLoading]         = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError]             = useState("")
  const svgRef                        = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (status !== "completed") return
    loadGraph()
  }, [repositoryId, status])

  async function loadGraph() {
    setError("")
    setLoading(true)
    try {
      const g = await getDependencyGraph(repositoryId)
      setGraph(g)
      setPositions(layoutNodes(g.nodes))
    } catch {
      setError("Não foi possível carregar o grafo de dependências.")
    } finally {
      setLoading(false)
    }
  }

  async function selectNode(node: GraphNode) {
    setLoadingDetail(true)
    try {
      setSelected(await getModuleDetails(repositoryId, node.module_path))
    } catch {
      setSelected(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  if (status !== "completed") {
    return <Card><EmptyState icon="🔗" title="Indexe um repositório primeiro" /></Card>
  }

  if (loading) {
    return <Card><div className="py-12 flex justify-center"><ThinkingDots label="Carregando grafo de dependências…" /></div></Card>
  }

  if (!graph || positions.length === 0) {
    return (
      <Card>
        <EmptyState icon="🔗" title="Grafo não disponível" description="Verifique se o repositório possui arquivos Python." />
        <button onClick={loadGraph} className={`mt-4 ${btnSecondary}`}>↻ Tentar novamente</button>
      </Card>
    )
  }

  const maxDegree = Math.max(...graph.nodes.map(n => n.metrics.in_degree), 1)
  const filtered = filter
    ? positions.filter(n => n.label.toLowerCase().includes(filter.toLowerCase()) || n.module_path.toLowerCase().includes(filter.toLowerCase()))
    : positions

  const filteredIds = new Set(filtered.map(n => n.id))
  const nodeById = new Map(positions.map(n => [n.id, n]))

  const viewW = Math.max(...positions.map(n => n.x + BOX_W + 20), 600)
  const viewH = Math.max(...positions.map(n => n.y + BOX_H + 20), 400)

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      {/* Controls */}
      <Card className="py-3">
        <div className="flex gap-3 items-center flex-wrap">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar módulos…"
            className={`${inputCls} max-w-xs`}
          />
          <button onClick={loadGraph} className={btnSecondary}>↻ Recarregar</button>
          <div className="flex gap-3 ml-auto text-sm text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-400" /> Hub (alta entrada)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-orange-200 border border-orange-400" /> Intermediário</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400" /> Folha (baixa entrada)</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        {/* SVG Graph */}
        <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-gray-50" style={{ maxHeight: "70vh" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewW} ${viewH}`}
            width="100%"
            style={{ minWidth: "400px" }}
            className="font-mono"
          >
            {/* Edges */}
            {graph.edges.map(edge => {
              const src = nodeById.get(edge.source)
              const tgt = nodeById.get(edge.target)
              if (!src || !tgt) return null
              const faded = filter ? (!filteredIds.has(edge.source) && !filteredIds.has(edge.target)) : false
              const x1 = src.x + BOX_W / 2
              const y1 = src.y + BOX_H
              const x2 = tgt.x + BOX_W / 2
              const y2 = tgt.y
              const cy = (y1 + y2) / 2
              return (
                <g key={edge.id} opacity={faded ? 0.1 : 0.5}>
                  <defs>
                    <marker id={`arr-${edge.id}`} markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#a78bfa" />
                    </marker>
                  </defs>
                  <path
                    d={`M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`}
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth={1}
                    markerEnd={`url(#arr-${edge.id})`}
                  />
                </g>
              )
            })}

            {/* Nodes */}
            {positions.map(node => {
              const clr = nodeColor(node.metrics.in_degree, maxDegree)
              const faded = filter ? !filteredIds.has(node.id) : false
              return (
                <g
                  key={node.id}
                  opacity={faded ? 0.25 : 1}
                  className="cursor-pointer"
                  onClick={() => !faded && selectNode(node)}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={BOX_W}
                    height={BOX_H}
                    rx={6}
                    fill={clr.bg}
                    stroke={clr.border}
                    strokeWidth={1.5}
                  />
                  <text
                    x={node.x + BOX_W / 2}
                    y={node.y + BOX_H / 2 + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill={clr.text}
                    fontWeight="600"
                  >
                    {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
                  </text>
                  <text
                    x={node.x + BOX_W - 4}
                    y={node.y + 12}
                    textAnchor="end"
                    fontSize={8}
                    fill={clr.text}
                    opacity={0.7}
                  >
                    ↙{node.metrics.in_degree}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Detail panel */}
        {(selected || loadingDetail) && (
          <div className="w-72 shrink-0 space-y-3">
            {loadingDetail && (
              <Card><ThinkingDots label="Carregando detalhes…" /></Card>
            )}
            {selected && !loadingDetail && (
              <>
                <Card>
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{selected.label}</h3>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  <p className="text-xs font-mono text-gray-400 mb-3">{selected.module_path}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-red-50 rounded p-2"><p className="font-bold text-red-700">{selected.metrics.in_degree}</p><p className="text-red-500">Entrada</p></div>
                    <div className="bg-blue-50 rounded p-2"><p className="font-bold text-blue-700">{selected.metrics.out_degree}</p><p className="text-blue-500">Saída</p></div>
                    <div className="bg-gray-50 rounded p-2"><p className="font-bold text-gray-700">{selected.metrics.total_degree}</p><p className="text-gray-500">Total</p></div>
                  </div>
                </Card>

                {selected.inbound_dependencies.length > 0 && (
                  <Card title="Quem depende deste módulo">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selected.inbound_dependencies.map((d, i) => (
                        <p key={i} className="text-xs font-mono text-gray-600 truncate bg-gray-50 px-2 py-1 rounded">{d.source}</p>
                      ))}
                    </div>
                  </Card>
                )}

                {selected.outbound_dependencies.length > 0 && (
                  <Card title="Módulos que este usa">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selected.outbound_dependencies.map((d, i) => (
                        <p key={i} className="text-xs font-mono text-gray-600 truncate bg-gray-50 px-2 py-1 rounded">{d.target}</p>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm text-gray-500 px-1">
        <span>🔷 <strong>{graph.node_count}</strong> módulos</span>
        <span>→ <strong>{graph.edge_count}</strong> dependências</span>
        {filter && <span>🔍 <strong>{filtered.length}</strong> correspondências</span>}
      </div>
    </div>
  )
}
