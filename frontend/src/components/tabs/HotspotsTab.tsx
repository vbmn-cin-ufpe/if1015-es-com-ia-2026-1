import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Card,
  EmptyState,
  ThinkingDots,
  ErrorBanner,
  Icon,
  btnPrimary,
  btnSecondary,
  inputCls,
} from "../ui"
import { getHotspots, type FileHotspot } from "../../services/hotspotApi"
import { fadeUp, fadeUpTransition } from "../../animations"

interface Props {
  repositoryId: string
  status: string
}

const RISK_COLORS = [
  "bg-red-500",     // ≥75
  "bg-orange-500",  // ≥50
  "bg-yellow-500",  // ≥25
  "bg-green-500",   // <25
]

function riskColor(score: number): string {
  if (score >= 75) return RISK_COLORS[0]
  if (score >= 50) return RISK_COLORS[1]
  if (score >= 25) return RISK_COLORS[2]
  return RISK_COLORS[3]
}

function riskLabel(score: number): string {
  if (score >= 75) return "Crítico"
  if (score >= 50) return "Alto"
  if (score >= 25) return "Médio"
  return "Baixo"
}

function riskBadgeColor(score: number): string {
  if (score >= 75) return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
  if (score >= 50) return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
  if (score >= 25) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
  return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
}

export function HotspotsTab({ repositoryId, status }: Props) {
  const [topN, setTopN] = useState(30)
  const [churnMonths, setChurnMonths] = useState(6)
  const [hotspots, setHotspots] = useState<FileHotspot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [filterLang, setFilterLang] = useState("")
  const [minRisk, setMinRisk] = useState(0)

  async function handleAnalyse() {
    setLoading(true)
    setError(null)
    try {
      const result = await getHotspots(repositoryId, topN, churnMonths)
      setHotspots(result.hotspots)
      setHasLoaded(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar hotspots")
    } finally {
      setLoading(false)
    }
  }

  if (status !== "completed") {
    return (
      <EmptyState
        icon="fire"
        title="Repositório não indexado"
        description="Indexe o repositório primeiro para analisar hotspots."
      />
    )
  }

  const languages = [...new Set(hotspots.map((h) => h.language))].sort()
  const filtered = hotspots.filter(
    (h) =>
      (!filterLang || h.language === filterLang) &&
      h.hotspot_score >= minRisk,
  )
  const critical = filtered.filter((h) => h.hotspot_score >= 75).length
  const high = filtered.filter((h) => h.hotspot_score >= 50 && h.hotspot_score < 75).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="fire" className="text-2xl" />
          <h2 className="text-xl font-bold">Mapa de Hotspots</h2>
        </div>
        <p className="text-red-100 text-sm">
          Arquivos com maior risco: combinação de alta frequência de alterações (churn) e alta
          complexidade ciclomática.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Top N arquivos
            </label>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className={inputCls}
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Churn (meses)
            </label>
            <select
              value={churnMonths}
              onChange={(e) => setChurnMonths(Number(e.target.value))}
              className={inputCls}
            >
              {[3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m} meses
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleAnalyse} disabled={loading} className={btnPrimary}>
            {loading ? <ThinkingDots label="Analisando" /> : (
              <>
                <Icon name="magnifying-glass-chart" />
                Analisar Hotspots
              </>
            )}
          </button>
        </div>
      </Card>

      {error && <ErrorBanner message={error} />}

      <AnimatePresence>
        {hasLoaded && !loading && (
          <motion.div
            key="results"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={fadeUpTransition}
            className="space-y-4"
          >
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total", value: filtered.length, color: "text-gray-800 dark:text-gray-100" },
                { label: "Crítico (≥75)", value: critical, color: "text-red-600 dark:text-red-400" },
                { label: "Alto (50–74)", value: high, color: "text-orange-600 dark:text-orange-400" },
                {
                  label: "Score Máx",
                  value: filtered[0] ? `${filtered[0].hotspot_score.toFixed(0)}%` : "—",
                  color: "text-indigo-600 dark:text-indigo-400",
                },
              ].map((s) => (
                <Card key={s.label} className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Filtrar:</span>
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className={`${inputCls} w-40`}
                >
                  <option value="">Todas as linguagens</option>
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      .{l}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Risco mínimo:</label>
                  <input
                    type="range"
                    min={0}
                    max={75}
                    step={25}
                    value={minRisk}
                    onChange={(e) => setMinRisk(Number(e.target.value))}
                    className="w-28"
                  />
                  <span className="text-xs font-medium w-6">{minRisk}%</span>
                </div>
                {(filterLang || minRisk > 0) && (
                  <button
                    onClick={() => { setFilterLang(""); setMinRisk(0) }}
                    className={btnSecondary}
                  >
                    <Icon name="xmark" /> Limpar
                  </button>
                )}
              </div>
            </Card>

            {/* File list */}
            {filtered.length === 0 ? (
              <EmptyState
                icon="circle-check"
                title="Nenhum hotspot encontrado"
                description="Sem arquivos de alto risco com os filtros atuais."
              />
            ) : (
              <Card>
                <div className="space-y-2">
                  {filtered.map((h, idx) => (
                    <motion.div
                      key={h.file_path}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      transition={{ ...fadeUpTransition, delay: idx * 0.02 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      {/* Rank */}
                      <span className="text-xs font-bold text-gray-400 w-6 text-right shrink-0">
                        #{idx + 1}
                      </span>

                      {/* Score bar */}
                      <div className="w-16 shrink-0">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`${riskColor(h.hotspot_score)} h-1.5 rounded-full transition-all`}
                            style={{ width: `${h.hotspot_score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-center text-gray-500 mt-0.5">
                          {h.hotspot_score.toFixed(0)}%
                        </p>
                      </div>

                      {/* File path */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                          {h.file_path}
                        </p>
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-gray-500">
                            <Icon name="rotate" className="mr-0.5" />
                            {h.churn} commits
                          </span>
                          <span className="text-[11px] text-gray-500">
                            <Icon name="code" className="mr-0.5" />
                            cx {h.complexity.toFixed(1)}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            <Icon name="lines-leaning" className="mr-0.5" />
                            {h.loc} linhas
                          </span>
                        </div>
                      </div>

                      {/* Language badge */}
                      <span className="text-[11px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded shrink-0">
                        .{h.language}
                      </span>

                      {/* Risk badge */}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${riskBadgeColor(
                          h.hotspot_score,
                        )}`}
                      >
                        {riskLabel(h.hotspot_score)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
