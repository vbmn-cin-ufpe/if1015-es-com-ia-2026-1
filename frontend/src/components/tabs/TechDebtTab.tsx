import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, Icon, EmptyState, ErrorBanner, ThinkingDots, btnPrimary } from "../ui"
import { getTechDebtHistory, TechDebtSnapshot } from "../../services/techDebtApi"
import { getReportUrl } from "../../services/reportApi"

interface Props {
  repositoryId: string
  status: string
}

function ScoreLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function RiskBadge({ score }: { score: number }) {
  if (score >= 75) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-900 text-red-300">Crítico</span>
  if (score >= 50) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-900 text-orange-300">Alto</span>
  if (score >= 25) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-900 text-yellow-300">Médio</span>
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900 text-green-300">Baixo</span>
}

// Simple SVG line chart
function LineChart({ snapshots }: { snapshots: TechDebtSnapshot[] }) {
  if (snapshots.length < 2) return (
    <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
      Aguardando mais snapshots para exibir o gráfico…
    </div>
  )

  const W = 600, H = 160, PAD = 32
  const values = snapshots.map(s => s.avg_score)
  const minV = Math.min(...values)
  const maxV = Math.max(...values) || 1
  const xStep = (W - PAD * 2) / (snapshots.length - 1)

  const pts = snapshots.map((s, i) => ({
    x: PAD + i * xStep,
    y: H - PAD - ((s.avg_score - minV) / (maxV - minV + 0.001)) * (H - PAD * 2),
    snap: s,
  }))

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = H - PAD - ((v - minV) / (maxV - minV + 0.001)) * (H - PAD * 2)
          if (y < PAD || y > H - PAD) return null
          return (
            <g key={v}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
              <text x={4} y={y + 4} fill="#64748b" fontSize="9">{v}</text>
            </g>
          )
        })}
        {/* Line */}
        <path d={d} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Area */}
        <path
          d={`${d} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`}
          fill="#7c3aed" fillOpacity="0.12"
        />
        {/* Dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#7c3aed" stroke="#1e293b" strokeWidth="1.5" />
            {/* X-axis date label for first, last and every 5th */}
            {(i === 0 || i === pts.length - 1 || i % 5 === 0) && (
              <text x={p.x} y={H - 6} fill="#94a3b8" fontSize="8" textAnchor="middle">
                {p.snap.snapshot_ts.slice(5, 10)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export function TechDebtTab({ repositoryId, status }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<TechDebtSnapshot[]>([])

  const load = useCallback(async () => {
    if (!repositoryId) return
    setLoading(true)
    setError("")
    try {
      const data = await getTechDebtHistory(repositoryId)
      setHistory(data)
    } catch (e: any) {
      setError(e.message || "Erro ao carregar histórico de dívida técnica")
    } finally {
      setLoading(false)
    }
  }, [repositoryId])

  useEffect(() => { load() }, [load])

  const latest = history.length > 0 ? history[history.length - 1] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-xl p-6 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-700/40">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-700/50">
              <Icon name="bug" className="text-indigo-300 text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Score de Dívida Técnica</h2>
              <p className="text-indigo-300 text-sm">Evolução temporal do hotspot médio por re-indexação</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className={btnPrimary} disabled={loading}>
              {loading ? <ThinkingDots /> : <><Icon name="rotate" className="mr-1" />Atualizar</>}
            </button>
            {repositoryId && (
              <a
                href={getReportUrl(repositoryId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition"
              >
                <Icon name="file-export" className="text-sm" />
                Exportar Relatório
              </a>
            )}
          </div>
        </div>
      </div>

      {status !== "completed" && (
        <EmptyState icon="bug" message="O repositório precisa estar indexado para calcular a dívida técnica." />
      )}

      {status === "completed" && (
        <>
          {error && <ErrorBanner message={error} />}

          {/* KPIs */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Score Médio", value: latest.avg_score.toFixed(1), icon: "chart-line", color: "text-purple-400" },
                { label: "Arquivos Analisados", value: latest.total_files, icon: "file-code", color: "text-blue-400" },
                { label: "Críticos (≥75)", value: latest.critical_count, icon: "triangle-exclamation", color: "text-red-400" },
                { label: "Altos (≥50)", value: latest.high_count, icon: "exclamation", color: "text-orange-400" },
              ].map(({ label, value, icon, color }) => (
                <Card key={label} className="text-center py-4">
                  <Icon name={icon} className={`${color} text-2xl mb-1`} />
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{label}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Chart */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Icon name="chart-line" className="text-purple-400" />
              Evolução do Score Médio
            </h3>
            {loading ? (
              <div className="flex justify-center py-8"><ThinkingDots /></div>
            ) : history.length === 0 ? (
              <EmptyState
                icon="chart-line"
                message="Nenhum snapshot ainda. O score é calculado automaticamente a cada re-indexação."
              />
            ) : (
              <LineChart snapshots={history} />
            )}
          </Card>

          {/* Timeline table */}
          {history.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Icon name="clock-rotate-left" className="text-purple-400" />
                Histórico de Snapshots
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                      <th className="text-left py-2 px-3">Data/Hora</th>
                      <th className="text-right py-2 px-3">Score Médio</th>
                      <th className="text-right py-2 px-3">Arquivos</th>
                      <th className="text-right py-2 px-3">Críticos</th>
                      <th className="text-right py-2 px-3">Altos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map(s => (
                      <tr key={s.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-300 font-mono text-xs">
                          {new Date(s.snapshot_ts).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={`font-bold ${s.avg_score >= 75 ? "text-red-400" : s.avg_score >= 50 ? "text-orange-400" : s.avg_score >= 25 ? "text-yellow-400" : "text-green-400"}`}>
                            {s.avg_score.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">{s.total_files}</td>
                        <td className="py-2 px-3 text-right text-red-400">{s.critical_count}</td>
                        <td className="py-2 px-3 text-right text-orange-400">{s.high_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Top files from latest snapshot */}
          {latest && latest.top_files.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Icon name="fire" className="text-orange-400" />
                Arquivos Mais Críticos (último snapshot)
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {latest.top_files.slice(0, 15).map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/40">
                    <div className="text-slate-500 text-xs w-5 text-right">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-200 text-xs font-mono truncate">{f.relative_path}</div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {f.language} · {f.loc} linhas · churn: {f.churn}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-white">{f.hotspot_score.toFixed(1)}</div>
                      <RiskBadge score={f.hotspot_score} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  )
}
