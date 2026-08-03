import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, Icon, EmptyState, ErrorBanner, ThinkingDots, btnPrimary } from "../ui"
import { useI18n } from "../../i18n"
import type { Translations } from "../../i18n"
import { getTechDebtHistory, analyseTechDebt, TechDebtSnapshot } from "../../services/techDebtApi"
import { getReportUrl } from "../../services/reportApi"

interface Props {
  repositoryId: string
  status: string
}

type TFn = (key: keyof Translations, vars?: Record<string, string>) => string

// ---- Sub-components -------------------------------------------------------

function TrendBadge({ trend, t }: { trend: string; t: TFn }) {
  if (trend === "improving")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/40">
        {t('debt_trend_improving')}
      </span>
    )
  if (trend === "degrading")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-900/60 text-red-300 border border-red-700/40">
        {t('debt_trend_degrading')}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/60 text-slate-300 border border-slate-600/40">
      {t('debt_trend_stable')}
    </span>
  )
}

function RiskBadge({ score, t }: { score: number; t: TFn }) {
  if (score >= 75)
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-900 text-red-300">{t('common_critical')}</span>
  if (score >= 50)
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-900 text-orange-300">{t('common_high')}</span>
  if (score >= 25)
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-900 text-yellow-300">{t('common_medium')}</span>
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900 text-green-300">{t('common_low')}</span>
}

function DebtBreakdownCard({ breakdown, t }: { breakdown: Record<string, number>; t: TFn }) {
  const categories = [
    { key: "complexity", label: t('common_complexity'), color: "#3b82f6", desc: t('debt_catComplexityDesc') },
    { key: "churn", label: t('debt_catChurn'), color: "#6366f1", desc: t('debt_catChurnDesc') },
    { key: "size", label: t('debt_catSize'), color: "#f59e0b", desc: t('debt_catSizeDesc') },
    { key: "coupling", label: t('tour_scoreCoupling'), color: "#f97316", desc: t('debt_catCouplingDesc') },
    { key: "documentation", label: t('debt_catDocumentation'), color: "#ef4444", desc: t('debt_catDocumentationDesc') },
  ]
  return (
    <div className="space-y-3">
      {categories.map(({ key, label, color, desc }) => {
        const value = breakdown[key] ?? 0
        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-sm text-slate-200 font-medium">{label}</span>
                <span className="text-xs text-slate-500 ml-2 hidden sm:inline">{desc}</span>
              </div>
              <span className="text-sm font-bold tabular-nums" style={{ color }}>{value.toFixed(0)}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(value, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MetricSparkline({
  snapshots,
  getValue,
  color,
  label,
  unit = "",
  t,
}: {
  snapshots: TechDebtSnapshot[]
  getValue: (s: TechDebtSnapshot) => number
  color: string
  label: string
  unit?: string
  t: TFn
}) {
  if (snapshots.length < 2)
    return (
      <div className="flex items-center justify-center h-14 text-slate-500 text-xs">
        {t('debt_waiting')}
      </div>
    )
  const values = snapshots.map(getValue)
  const maxV = Math.max(...values) || 1
  const minV = Math.min(...values)
  const W = 200, H = 56, PAD = 6
  const xStep = (W - PAD * 2) / (snapshots.length - 1)
  const pts = values.map((v, i) => ({
    x: PAD + i * xStep,
    y: H - PAD - ((v - minV) / (maxV - minV + 0.001)) * (H - PAD * 2),
  }))
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const latest = values[values.length - 1]
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{latest.toFixed(1)}{unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14">
        <path
          d={`${d} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`}
          fill={color} fillOpacity="0.1"
        />
        <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} stroke="#1e293b" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

function ScoreTrendChart({ snapshots, t }: { snapshots: TechDebtSnapshot[]; t: TFn }) {
  if (snapshots.length < 2)
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        {t('debt_waitingSnapshots')}
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
        {[0, 25, 50, 75, 100].map(v => {
          const y = H - PAD - ((v - minV) / (maxV - minV + 0.001)) * (H - PAD * 2)
          if (y < PAD || y > H - PAD) return null
          return (
            <g key={v}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y}
                stroke={v >= 75 ? "#7f1d1d50" : "#334155"}
                strokeDasharray={v >= 75 ? "0" : "4 4"}
                strokeWidth={v >= 75 ? "1.5" : "1"} />
              <text x={4} y={y + 4} fill="#64748b" fontSize="9">{v}</text>
            </g>
          )
        })}
        <path d={d} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={`${d} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`}
          fill="#7c3aed" fillOpacity="0.12"
        />
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y} r="4"
              fill={p.snap.avg_score >= 75 ? "#ef4444" : p.snap.avg_score >= 50 ? "#f97316" : "#7c3aed"}
              stroke="#1e293b" strokeWidth="1.5"
            />
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

function LlmSummaryCard({ summary }: { summary: string }) {
  const lines = summary.split("\n")
  return (
    <div className="space-y-0.5 text-sm">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        if (line.startsWith("**") && line.includes(":**")) {
          const colonIdx = line.indexOf(":**")
          const header = line.slice(2, colonIdx)
          const rest = line.slice(colonIdx + 3).trim()
          return (
            <div key={i} className="pt-2 first:pt-0">
              <span className="text-white font-semibold">{header}:</span>
              {rest && <span className="text-slate-300"> {rest}</span>}
            </div>
          )
        }
        if (line.startsWith("- "))
          return (
            <div key={i} className="flex gap-2 pl-3">
              <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
              <span className="text-slate-300">{line.slice(2)}</span>
            </div>
          )
        const numbered = line.match(/^(\d+)\. (.+)/)
        if (numbered)
          return (
            <div key={i} className="flex gap-2 pl-3">
              <span className="text-indigo-400 font-mono shrink-0 w-5">{numbered[1]}.</span>
              <span className="text-slate-300">{numbered[2]}</span>
            </div>
          )
        return <p key={i} className="text-slate-300">{line}</p>
      })}
    </div>
  )
}

// ---- Main component -------------------------------------------------------

export function TechDebtTab({ repositoryId, status }: Props) {
    const { t, locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<TechDebtSnapshot[]>([])

  const load = useCallback(async () => {
    if (!repositoryId) return
    setLoading(true)
    setError("")
    try {
      const data = await getTechDebtHistory(repositoryId)
      setHistory(data)
    } catch (e: unknown) {
      setError((e as Error).message || t('debt_errLoadHistory'))
    } finally {
      setLoading(false)
    }
  }, [repositoryId, t])

  const analyse = useCallback(async () => {
    if (!repositoryId) return
    setAnalysing(true)
    setError("")
    try {
      await analyseTechDebt(repositoryId)
      await load()
    } catch (e: unknown) {
      setError((e as Error).message || t('debt_errAnalyze'))
    } finally {
      setAnalysing(false)
    }
  }, [repositoryId, load, t])

  useEffect(() => {
    load()
  }, [load])

  const latest = history.length > 0 ? history[history.length - 1] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-xl p-5 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-700/40">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-700/50">
              <Icon name="bug" className="text-indigo-300 text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{t('debt_title')}</h2>
                {latest && <TrendBadge trend={latest.debt_trend} t={t} />}
              </div>
              <p className="text-indigo-300 text-sm mt-0.5">
                {t('debt_subtitle')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {status === "completed" && (
              <button
                onClick={analyse}
                disabled={analysing || loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {analysing ? (
                  <><ThinkingDots /> {t('debt_analyzing')}</>
                ) : (
                  <><Icon name="wand-magic-sparkles" className="text-sm" />{t('debt_analyzeBtn')}</>
                )}
              </button>
            )}
            <button onClick={load} className={btnPrimary} disabled={loading || analysing}>
              {loading ? <ThinkingDots /> : <><Icon name="rotate" className="mr-1" />{t('debt_refreshBtn')}</>}
            </button>
            {repositoryId && (
              <a
                href={getReportUrl(repositoryId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition"
              >
                <Icon name="file-export" className="text-sm" />
                {t('debt_exportBtn')}
              </a>
            )}
          </div>
        </div>
      </div>

      {status !== "completed" && (
        <EmptyState icon="bug" message={t('debt_noRepoDesc')} />
      )}

      {status === "completed" && (
        <>
          {error && <ErrorBanner message={error} />}

          {/* KPI Cards */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: t('debt_avgScore'), value: latest.avg_score.toFixed(1), icon: "chart-line", color: "text-purple-400" },
                { label: t('common_files'), value: latest.total_files, icon: "file-code", color: "text-blue-400" },
                { label: t('debt_criticalCount'), value: latest.critical_count, icon: "triangle-exclamation", color: "text-red-400" },
                { label: t('debt_highCount'), value: latest.high_count, icon: "exclamation", color: "text-orange-400" },
                { label: t('debt_avgCC'), value: latest.avg_complexity.toFixed(1), icon: "code-branch", color: "text-sky-400" },
                { label: t('debt_avgChurn'), value: latest.avg_churn.toFixed(1), icon: "arrows-rotate", color: "text-amber-400" },
              ].map(({ label, value, icon, color }) => (
                <Card key={label} className="text-center py-4 px-2">
                  <Icon name={icon} className={`${color} text-2xl mb-1`} />
                  <div className="text-xl font-bold text-white">{value}</div>
                  <div className="text-slate-400 text-xs mt-0.5 leading-tight">{label}</div>
                </Card>
              ))}
            </div>
          )}

          {/* LLM Summary */}
          {latest?.llm_summary && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="wand-magic-sparkles" className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-300">{t('debt_aiAnalysis')}</h3>
                <span className="ml-auto text-xs text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-700/40">
                  {t('debt_aiLabel')}
                </span>
              </div>
              <LlmSummaryCard summary={latest.llm_summary} />
            </Card>
          )}

          {!latest?.llm_summary && latest && (
            <div className="rounded-xl p-4 bg-slate-800/50 border border-slate-700/40 flex items-center gap-3 text-sm text-slate-400">
              <Icon name="wand-magic-sparkles" className="text-indigo-400 shrink-0" />
              <span>
                {t('debt_clickAnalyzePrefix')} <strong className="text-white">{t('debt_analyzeBtn')}</strong> {t('debt_clickAnalyzeSuffix')}
              </span>
            </div>
          )}

          {/* Score trend chart */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Icon name="chart-line" className="text-purple-400" />
              {t('debt_evolution')}
              {latest && (
                <span className="ml-auto text-xs text-slate-500">
                  {t('debt_lastLabel')} {new Date(latest.snapshot_ts).toLocaleString(locale)}
                </span>
              )}
            </h3>
            {loading ? (
              <div className="flex justify-center py-8"><ThinkingDots /></div>
            ) : history.length === 0 ? (
              <EmptyState icon="chart-line" message={t('debt_noSnapshots')} />
            ) : (
              <ScoreTrendChart snapshots={history} t={t} />
            )}
          </Card>

          {/* Metrics: breakdown + sparklines */}
          {latest && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Icon name="layer-group" className="text-indigo-400" />
                    {t('debt_categoryTitle')}
                    <span className="text-xs text-slate-500 ml-1">{t('debt_categoryScale')}</span>
                  </h3>
                  {Object.keys(latest.debt_breakdown).length > 0 ? (
                    <DebtBreakdownCard breakdown={latest.debt_breakdown} t={t} />
                  ) : (
                    <p className="text-slate-500 text-sm">
                      {t('debt_categoryDataHint')} <strong className="text-white">{t('debt_analyzeBtn')}</strong>.
                    </p>
                  )}
                </Card>
              </div>

              <Card>
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Icon name="chart-simple" className="text-sky-400" />
                  {t('debt_metricsTrend')}
                </h3>
                <div className="space-y-4">
                  <MetricSparkline
                    snapshots={history}
                    getValue={s => s.avg_complexity}
                    color="#38bdf8"
                    label={t('debt_avgCyclomaticComplexity')}
                    t={t}
                  />
                  <div className="border-t border-slate-700/50 pt-4">
                    <MetricSparkline
                      snapshots={history}
                      getValue={s => s.avg_churn}
                      color="#f59e0b"
                      label={t('debt_avgChurnPerFile')}
                      t={t}
                    />
                  </div>
                  <div className="border-t border-slate-700/50 pt-4">
                    <MetricSparkline
                      snapshots={history}
                      getValue={s => s.comment_ratio * 100}
                      color="#34d399"
                      label={t('debt_commentRatio')}
                      unit="%"
                      t={t}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Top critical files */}
          {latest && latest.top_files.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Icon name="fire" className="text-orange-400" />
                {t('debt_topFilesTitle')}
                <span className="text-xs text-slate-500 ml-1">{t('debt_lastSnapshotHint')}</span>
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {latest.top_files.slice(0, 15).map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/40 transition">
                    <div className="text-slate-500 text-xs w-5 text-right font-mono shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-200 text-xs font-mono truncate">{f.relative_path}</div>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-slate-500">{f.language}</span>
                        <span className="text-xs text-slate-500">{f.loc} LOC</span>
                        <span className="text-xs text-sky-500">CC {f.complexity.toFixed(1)}</span>
                        <span className="text-xs text-amber-500">{f.churn} {t('common_commits').toLowerCase()}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-white">{f.hotspot_score.toFixed(1)}</div>
                      <RiskBadge score={f.hotspot_score} t={t} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Timeline table */}
          {history.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Icon name="clock-rotate-left" className="text-purple-400" />
                {t('debt_snapshotsHistory')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                      <th className="text-left py-2 px-3">{t('drift_tableDate')}</th>
                      <th className="text-right py-2 px-3">{t('hotspots_score')}</th>
                      <th className="text-right py-2 px-3">{t('common_files')}</th>
                      <th className="text-right py-2 px-3">{t('debt_tableCritical')}</th>
                      <th className="text-right py-2 px-3">{t('debt_tableAvgCC')}</th>
                      <th className="text-right py-2 px-3">{t('debt_tableTrend')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map(s => (
                      <tr key={s.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-300 font-mono text-xs">
                          {new Date(s.snapshot_ts).toLocaleString(locale)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={`font-bold ${s.avg_score >= 75 ? "text-red-400" : s.avg_score >= 50 ? "text-orange-400" : s.avg_score >= 25 ? "text-yellow-400" : "text-green-400"}`}>
                            {s.avg_score.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">{s.total_files}</td>
                        <td className="py-2 px-3 text-right text-red-400">{s.critical_count}</td>
                        <td className="py-2 px-3 text-right text-sky-400">{s.avg_complexity.toFixed(1)}</td>
                        <td className="py-2 px-3 text-right"><TrendBadge trend={s.debt_trend} t={t} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  )
}
