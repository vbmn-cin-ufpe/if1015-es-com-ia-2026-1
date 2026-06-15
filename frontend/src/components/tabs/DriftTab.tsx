import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, Icon, EmptyState, ErrorBanner, ThinkingDots, btnPrimary, btnSecondary } from "../ui"
import {
  listGraphSnapshots,
  getGraphDiff,
  interpretDrift,
  SnapshotMeta,
  DriftReport,
  NodeChange,
  EdgeChange,
} from "../../services/driftApi"

interface Props {
  repositoryId: string
  status: string
}

function ChangeBadge({ change }: { change: string }) {
  if (change === "added")
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900 text-green-300">+ Novo</span>
  if (change === "removed")
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-900 text-red-300">− Removido</span>
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300">= Igual</span>
}

function DriftScore({ score }: { score: number }) {
  const color = score >= 50 ? "text-red-400" : score >= 20 ? "text-orange-400" : score >= 5 ? "text-yellow-400" : "text-green-400"
  const label = score >= 50 ? "Alto" : score >= 20 ? "Médio" : score >= 5 ? "Baixo" : "Mínimo"
  return (
    <div className="text-center">
      <div className={`text-5xl font-black ${color}`}>{score.toFixed(1)}%</div>
      <div className="text-slate-400 text-sm mt-1">Drift Arquitetural — {label}</div>
      <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${score >= 50 ? "bg-red-500" : score >= 20 ? "bg-orange-500" : score >= 5 ? "bg-yellow-500" : "bg-green-500"}`}
          style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  )
}

function ChangeList({ title, icon, color, items }: {
  title: string
  icon: string
  color: string
  items: (NodeChange | EdgeChange)[]
}) {
  if (items.length === 0) return null
  return (
    <div>
      <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${color}`}>
        <Icon name={icon} />{title} ({items.length})
      </h4>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
        {items.map((item, i) => {
          const isNode = "node_id" in item
          return (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-slate-800/60 text-xs font-mono">
              <ChangeBadge change={item.change} />
              <span className="text-slate-300 truncate flex-1">
                {isNode ? (item as NodeChange).label : `${(item as EdgeChange).source} → ${(item as EdgeChange).target}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DriftTab({ repositoryId, status }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [selectedA, setSelectedA] = useState("")
  const [selectedB, setSelectedB] = useState("")
  const [dateFilterA, setDateFilterA] = useState("")
  const [dateFilterB, setDateFilterB] = useState("")
  const [report, setReport] = useState<DriftReport | null>(null)
  const [comparing, setComparing] = useState(false)
  const [interpreting, setInterpreting] = useState(false)
  const [interpretation, setInterpretation] = useState("")

  // Find closest snapshot to a given date string (YYYY-MM-DD)
  function closestSnapshot(dateStr: string): string {
    if (!dateStr || snapshots.length === 0) return ""
    const target = new Date(dateStr).getTime()
    return snapshots.reduce((best, s) => {
      const dBest = Math.abs(new Date(best.created_at).getTime() - target)
      const dCur  = Math.abs(new Date(s.created_at).getTime() - target)
      return dCur < dBest ? s : best
    }).snapshot_id
  }

  const loadSnapshots = useCallback(async () => {
    if (!repositoryId) return
    setLoading(true)
    setError("")
    try {
      const data = await listGraphSnapshots(repositoryId)
      setSnapshots(data)
      if (data.length >= 2) {
        setSelectedA(data[data.length - 2].snapshot_id)
        setSelectedB(data[data.length - 1].snapshot_id)
      } else if (data.length === 1) {
        setSelectedA(data[0].snapshot_id)
      }
    } catch (e: any) {
      setError(e.message || "Erro ao carregar snapshots")
    } finally {
      setLoading(false)
    }
  }, [repositoryId])

  useEffect(() => { loadSnapshots() }, [loadSnapshots])

  // When date filter A changes, auto-select closest snapshot
  useEffect(() => {
    if (dateFilterA) setSelectedA(closestSnapshot(dateFilterA))
  }, [dateFilterA, snapshots])

  // When date filter B changes, auto-select closest snapshot
  useEffect(() => {
    if (dateFilterB) setSelectedB(closestSnapshot(dateFilterB))
  }, [dateFilterB, snapshots])

  async function handleCompare() {
    if (!selectedA || !selectedB || selectedA === selectedB) return
    setComparing(true)
    setError("")
    setReport(null)
    setInterpretation("")
    try {
      const data = await getGraphDiff(repositoryId, selectedA, selectedB)
      setReport(data)
    } catch (e: any) {
      setError(e.message || "Erro ao comparar snapshots")
    } finally {
      setComparing(false)
    }
  }

  async function handleInterpret() {
    if (!selectedA || !selectedB) return
    setInterpreting(true)
    setInterpretation("")
    try {
      const res = await interpretDrift(repositoryId, selectedA, selectedB)
      setInterpretation(res.interpretation)
    } catch (e: any) {
      setError(e.message || "Erro ao interpretar drift")
    } finally {
      setInterpreting(false)
    }
  }

  const fmtTs = (ts: string) => ts ? new Date(ts).toLocaleString("pt-BR") : "—"
  const fmtId = (id: string) => id.slice(0, 8) + "…"

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-xl p-6 bg-gradient-to-r from-teal-900/60 to-cyan-900/60 border border-teal-700/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-700/50">
            <Icon name="code-compare" className="text-teal-300 text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Detecção de Drift Arquitetural</h2>
            <p className="text-teal-300 text-sm">Compare dois snapshots do grafo de dependências</p>
          </div>
        </div>
      </div>

      {status !== "completed" && (
        <EmptyState icon="code-compare" message="O repositório precisa ser indexado para gerar snapshots do grafo." />
      )}

      {status === "completed" && (
        <>
          {error && <ErrorBanner message={error} />}

          {/* Snapshot selector */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Icon name="sliders" className="text-teal-400" />Selecionar Snapshots
            </h3>
            {loading ? (
              <div className="flex justify-center py-6"><ThinkingDots /></div>
            ) : snapshots.length === 0 ? (
              <EmptyState
                icon="diagram-project"
                message="Nenhum snapshot disponível. O grafo é gerado automaticamente ao acessar a aba Grafo com o repositório indexado."
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Snapshot A */}
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400">Snapshot A (base)</label>
                    <input
                      type="date"
                      value={dateFilterA}
                      onChange={e => setDateFilterA(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      title="Filtrar por data — seleciona o snapshot mais próximo"
                    />
                    <select
                      value={selectedA}
                      onChange={e => { setSelectedA(e.target.value); setDateFilterA("") }}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Selecionar…</option>
                      {snapshots.map(s => (
                        <option key={s.snapshot_id} value={s.snapshot_id}>
                          {fmtTs(s.created_at)} — {s.node_count}n/{s.edge_count}e
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Snapshot B */}
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400">Snapshot B (comparar com)</label>
                    <input
                      type="date"
                      value={dateFilterB}
                      onChange={e => setDateFilterB(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      title="Filtrar por data — seleciona o snapshot mais próximo"
                    />
                    <select
                      value={selectedB}
                      onChange={e => { setSelectedB(e.target.value); setDateFilterB("") }}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Selecionar…</option>
                      {snapshots.map(s => (
                        <option key={s.snapshot_id} value={s.snapshot_id}>
                          {fmtTs(s.created_at)} — {s.node_count}n/{s.edge_count}e
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500 -mt-2">
                  <Icon name="circle-info" className="mr-1" />
                  Use o campo de data para navegar rapidamente ao snapshot mais próximo de uma data específica.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCompare}
                    disabled={!selectedA || !selectedB || selectedA === selectedB || comparing}
                    className={btnPrimary + " flex-1"}
                  >
                    {comparing ? <ThinkingDots /> : <><Icon name="code-compare" className="mr-1.5" />Comparar Snapshots</>}
                  </button>
                  {report && (
                    <button
                      onClick={handleInterpret}
                      disabled={interpreting}
                      className="px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {interpreting ? <ThinkingDots /> : <><Icon name="wand-magic-sparkles" />Interpretar com IA</>}
                    </button>
                  )}
                </div>
                {selectedA === selectedB && selectedA && (
                  <p className="text-xs text-orange-400 text-center">Selecione dois snapshots diferentes para comparar.</p>
                )}
              </div>
            )}
          </Card>

          {/* Snapshot list */}
          {snapshots.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Icon name="clock-rotate-left" className="text-teal-400" />
                Snapshots disponíveis ({snapshots.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Data/Hora</th>
                      <th className="text-right py-2 px-3">Nós</th>
                      <th className="text-right py-2 px-3">Arestas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map(s => (
                      <tr key={s.snapshot_id} className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer"
                        onClick={() => setSelectedB(s.snapshot_id)}>
                        <td className="py-2 px-3 text-slate-400 font-mono">{fmtId(s.snapshot_id)}</td>
                        <td className="py-2 px-3 text-slate-300">{fmtTs(s.created_at)}</td>
                        <td className="py-2 px-3 text-right text-blue-400">{s.node_count}</td>
                        <td className="py-2 px-3 text-right text-purple-400">{s.edge_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Drift report */}
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Score card */}
              <Card className="py-6">
                <DriftScore score={report.drift_score} />
                <div className="mt-4 text-center text-xs text-slate-400">
                  {fmtTs(report.snapshot_a_ts)} → {fmtTs(report.snapshot_b_ts)}
                </div>
              </Card>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Nós Adicionados", value: report.nodes_added.length, color: "text-green-400", icon: "plus" },
                  { label: "Nós Removidos", value: report.nodes_removed.length, color: "text-red-400", icon: "minus" },
                  { label: "Arestas Adicionadas", value: report.edges_added.length, color: "text-emerald-400", icon: "arrows-turn-to-dots" },
                  { label: "Arestas Removidas", value: report.edges_removed.length, color: "text-orange-400", icon: "link-slash" },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-center">
                    <Icon name={icon} className={`${color} text-xl mb-1`} />
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Change lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <ChangeList
                    title="Nós Adicionados"
                    icon="plus"
                    color="text-green-400"
                    items={report.nodes_added}
                  />
                  <div className="mt-3">
                    <ChangeList
                      title="Nós Removidos"
                      icon="minus"
                      color="text-red-400"
                      items={report.nodes_removed}
                    />
                  </div>
                  {report.nodes_added.length === 0 && report.nodes_removed.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-4">Nenhuma mudança nos módulos</p>
                  )}
                </Card>
                <Card>
                  <ChangeList
                    title="Arestas Adicionadas"
                    icon="arrows-turn-to-dots"
                    color="text-emerald-400"
                    items={report.edges_added}
                  />
                  <div className="mt-3">
                    <ChangeList
                      title="Arestas Removidas"
                      icon="link-slash"
                      color="text-orange-400"
                      items={report.edges_removed}
                    />
                  </div>
                  {report.edges_added.length === 0 && report.edges_removed.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-4">Nenhuma mudança nas dependências</p>
                  )}
                </Card>
              </div>
            </motion.div>
          )}

          {/* LLM Interpretation panel */}
          <AnimatePresence>
            {(interpreting || interpretation) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
              >
                <Card>
                  <h3 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2">
                    <Icon name="wand-magic-sparkles" className="text-violet-400" />
                    Interpretação da IA
                  </h3>
                  {interpreting ? (
                    <div className="flex items-center gap-3 py-4 text-slate-400 text-sm">
                      <ThinkingDots />
                      <span>Analisando mudanças arquiteturais…</span>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                      {interpretation}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}
