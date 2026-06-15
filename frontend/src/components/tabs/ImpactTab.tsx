import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getImpactAnalysis, type ImpactEntry, type ImpactAnalysis } from "../../services/impactApi"
import {
  Card,
  ThinkingDots,
  EmptyState,
  ErrorBanner,
  btnPrimary,
  btnSecondary,
  Icon,
} from "../ui"

interface Props {
  repositoryId: string
  status: string
}

const DISTANCE_COLORS = [
  "bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  "bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
  "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300",
  "bg-lime-100 dark:bg-lime-900/40 border-lime-200 dark:border-lime-800 text-lime-700 dark:text-lime-300",
]
function distanceColor(d: number) {
  return DISTANCE_COLORS[Math.min(d - 1, DISTANCE_COLORS.length - 1)]
}

function ImpactEntryRow({ entry }: { entry: ImpactEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${distanceColor(entry.distance)}`}
    >
      <div className="shrink-0 w-6 h-6 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center text-xs font-bold">
        {entry.distance}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-semibold truncate">{entry.module_path}</p>
        <p className="text-[10px] opacity-70 truncate">{entry.label}</p>
      </div>
      {entry.direct && (
        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20">
          direto
        </span>
      )}
    </motion.div>
  )
}

export function ImpactTab({ repositoryId, status }: Props) {
  const [pendingModule, setPendingModule] = useState("")
  const [module, setModule] = useState("")
  const [maxDepth, setMaxDepth] = useState(5)
  const [result, setResult] = useState<ImpactAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [filterDirect, setFilterDirect] = useState(false)

  async function onAnalyze() {
    const m = pendingModule.trim()
    if (!m) return
    setModule(m)
    setLoading(true)
    setError("")
    setResult(null)
    setSearched(true)
    try {
      const r = await getImpactAnalysis(repositoryId, m, maxDepth)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha na análise de impacto.")
    } finally {
      setLoading(false)
    }
  }

  if (status !== "completed") {
    return (
      <Card>
        <EmptyState
          icon="circle-nodes"
          title="Indexe um repositório primeiro"
          description="A análise de impacto estará disponível após a indexação ser concluída."
        />
      </Card>
    )
  }

  const displayed = result
    ? filterDirect
      ? result.affected.filter((e) => e.direct)
      : result.affected
    : []

  // Group by distance
  const byDistance = displayed.reduce<Record<number, ImpactEntry[]>>((acc, e) => {
    ;(acc[e.distance] ??= []).push(e)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-md shadow-rose-200 dark:shadow-rose-900/40 shrink-0">
            <Icon name="circle-nodes" className="text-white text-base" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Análise de Impacto</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              "Se eu alterar este módulo, o que mais pode ser afetado?"
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="code-branch" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
            <input
              value={pendingModule}
              onChange={(e) => setPendingModule(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onAnalyze() }}
              placeholder="Ex: app/services/auth_service, src/utils/db…"
              className="w-full text-sm rounded-xl border border-rose-200 dark:border-rose-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder:text-gray-400"
            />
          </div>

          <select
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="text-sm rounded-xl border border-rose-200 dark:border-rose-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            {[2, 3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>Profundidade {n}</option>
            ))}
          </select>

          <button
            onClick={onAnalyze}
            disabled={loading || !pendingModule.trim()}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
          >
            {loading
              ? <><Icon name="spinner" className="animate-spin" /> Analisando…</>
              : <><Icon name="bolt" /> Analisar</>}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-12 flex justify-center">
          <ThinkingDots label="Percorrendo o grafo de dependências…" />
        </div>
      )}

      {!loading && searched && result && result.affected_count === 0 && (
        <Card>
          <EmptyState
            icon="circle-check"
            title="Nenhum módulo afetado"
            description={`Nenhum módulo depende de "${module}". É um módulo folha isolado.`}
          />
        </Card>
      )}

      {!loading && result && result.affected_count > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                <Icon name="triangle-exclamation" className="text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{result.affected_count}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">módulos afetados</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <Icon name="circle-nodes" className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{result.affected.filter((e) => e.direct).length}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">dependências diretas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <Icon name="layer-group" className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{result.max_depth_reached}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">profundidade máx.</p>
              </div>
            </div>

            <div className="ml-auto">
              <button
                onClick={() => setFilterDirect((f) => !f)}
                className={`${btnSecondary} text-xs`}
              >
                <Icon name={filterDirect ? "eye-slash" : "eye"} />
                {filterDirect ? "Mostrar todos" : "Só diretos"}
              </button>
            </div>
          </div>

          {/* Results grouped by distance */}
          {Object.entries(byDistance)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([dist, entries]) => (
              <div key={dist}>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${distanceColor(Number(dist))}`}>
                    {dist}
                  </span>
                  {Number(dist) === 1 ? "Dependências diretas" : `Nível ${dist} (transitivo)`}
                  <span className="text-gray-400">({entries.length})</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {entries.map((e) => (
                    <ImpactEntryRow key={e.module_path} entry={e} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
