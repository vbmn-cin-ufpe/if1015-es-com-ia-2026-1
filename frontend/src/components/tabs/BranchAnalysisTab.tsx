import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { EmptyState, ThinkingDots, ErrorBanner, Icon } from "../ui"
import { useI18n } from "../../i18n"
import {
  analyseBranch,
  listBranches,
  type BranchAnalysisResult,
} from "../../services/branchApi"

interface Props {
  repositoryId: string
  status: string
}

// ── Risk helpers ──────────────────────────────────────────────────────────────
function riskInfo(score: number) {
  if (score >= 75) return { label: "Alto", color: "#ef4444", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", bar: "bg-red-500" }
  if (score >= 50) return { label: "Médio", color: "#f97316", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", bar: "bg-orange-500" }
  if (score >= 25) return { label: "Baixo", color: "#eab308", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", bar: "bg-yellow-500" }
  return { label: "Mínimo", color: "#22c55e", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" }
}

// ── Branch chip ───────────────────────────────────────────────────────────────
function BranchChip({
  name, isCurrent, isSelected, onClick,
}: {
  name: string; isCurrent: boolean; isSelected: boolean; onClick: () => void
}) {
  const isMain = ["main", "master", "dev", "develop", "staging", "production"].includes(name.toLowerCase())
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium
        border transition-all duration-150 shrink-0
        ${isSelected
          ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200 dark:shadow-violet-900/30"
          : isMain
            ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40"
            : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
        }
      `}
    >
      <Icon name="code-branch" className="text-[9px]" />
      <span className="truncate max-w-[140px]">{name}</span>
      {isCurrent && (
        <span className="shrink-0 text-[8px] bg-emerald-500 text-white px-1 rounded font-sans">HEAD</span>
      )}
    </button>
  )
}

// ── Result panel ──────────────────────────────────────────────────────────────
function ResultPanel({ result }: { result: BranchAnalysisResult }) {
  const [tab, setTab] = useState<"summary" | "files" | "diff" | "risk">("summary")
  const ri = riskInfo(result.risk_score)

  const tabs = [
    { id: "summary" as const, label: "Resumo IA", icon: "sparkles" },
    { id: "files" as const, label: `Arquivos (${result.changed_files.length})`, icon: "file-pen" },
    { id: "diff" as const, label: "Diff Stat", icon: "code" },
    { id: "risk" as const, label: "Risco IA", icon: "triangle-exclamation" },
  ]

  // Group changed files by directory
  const filesByDir: Record<string, string[]> = {}
  for (const f of result.changed_files) {
    const parts = f.split("/")
    const dir = parts.length > 1 ? parts[0] : "(raiz)"
    if (!filesByDir[dir]) filesByDir[dir] = []
    filesByDir[dir].push(f)
  }

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Arquivos alterados", value: result.changed_files.length, icon: "file-pen", c: "text-violet-600 dark:text-violet-400" },
          { label: "Linhas adicionadas", value: `+${result.added_lines}`, icon: "plus", c: "text-emerald-600 dark:text-emerald-400" },
          { label: "Linhas removidas", value: `-${result.removed_lines}`, icon: "minus", c: "text-red-600 dark:text-red-400" },
          { label: "Módulos tocados", value: result.touched_modules.length, icon: "cubes", c: "text-amber-600 dark:text-amber-400" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.06, type: "spring", damping: 12 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center"
          >
            <Icon name={s.icon} className={`${s.c} text-lg mb-1 block`} />
            <p className={`text-xl font-bold tabular-nums ${s.c}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Risk score bar */}
      <div className={`rounded-xl border p-4 ${ri.bg} ${ri.border}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${ri.text}`}>
            Risco de Merge: {ri.label}
          </span>
          <span className={`text-2xl font-bold tabular-nums ${ri.text}`}>
            {result.risk_score.toFixed(0)}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${result.risk_score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${ri.bar}`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>Mínimo</span><span>Baixo</span><span>Médio</span><span>Alto</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-violet-600 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-900/10"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon name={t.icon} className="text-[10px]" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {tab === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.llm_summary}
                </div>
              </motion.div>
            )}
            {tab === "risk" && (
              <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.llm_risk_notes}
                </div>
              </motion.div>
            )}
            {tab === "files" && (
              <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-3">
                {result.touched_modules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {result.touched_modules.map(m => (
                      <span key={m} className="text-[10px] font-mono bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {Object.entries(filesByDir).map(([dir, files]) => (
                    <div key={dir}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Icon name="folder" className="text-amber-400" /> {dir}
                        <span className="font-normal normal-case tracking-normal">({files.length})</span>
                      </p>
                      <div className="space-y-0.5 ml-3">
                        {files.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-gray-700">
                            <Icon name="file-code" className="text-violet-400 shrink-0 text-[10px]" />
                            <span className="truncate">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {tab === "diff" && (
              <motion.div key="diff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                {result.diff_stat ? (
                  <pre className="text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-64 leading-relaxed bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    {result.diff_stat}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">Sem estatísticas de diff disponíveis.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function BranchAnalysisTab({ repositoryId, status }: Props) {
    const { t } = useI18n()
  const [branch, setBranch] = useState("")
  const [base, setBase] = useState("main")
  const [result, setResult] = useState<BranchAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Branch list state
  const [branches, setBranches] = useState<string[]>([])
  const [currentBranch, setCurrentBranch] = useState<string | null>(null)
  const [branchSearch, setBranchSearch] = useState("")
  const [loadingBranches, setLoadingBranches] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load branches on mount
  useEffect(() => {
    if (status !== "completed") return
    setLoadingBranches(true)
    listBranches(repositoryId)
      .then(r => {
        setBranches(r.branches)
        setCurrentBranch(r.current)
        // Pre-set base to current or main
        if (r.current) setBase(r.current)
      })
      .catch(() => {/* ignore silently */})
      .finally(() => setLoadingBranches(false))
  }, [repositoryId, status])

  async function handleAnalyse(branchName?: string) {
    const target = (branchName ?? branch).trim()
    if (!target) return
    if (branchName) setBranch(branchName)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await analyseBranch(repositoryId, target, base.trim() || "main")
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao analisar branch")
    } finally {
      setLoading(false)
    }
  }

  if (status !== "completed") {
    return (
      <EmptyState
        icon="code-branch"
        title="Repositório não indexado"
        description="Indexe o repositório primeiro para analisar branches."
      />
    )
  }

  // Prioritized "quick-access" branches
  const PRIORITY = ["main", "master", "dev", "develop", "staging", "production", "release"]
  const quickBranches = branches.filter(b =>
    PRIORITY.includes(b.toLowerCase()) || b === currentBranch
  ).slice(0, 8)

  // Filtered list (excluding quick branches to avoid duplication, apply search)
  const filteredBranches = branches.filter(b => {
    const inQuick = quickBranches.includes(b)
    const matchSearch = !branchSearch || b.toLowerCase().includes(branchSearch.toLowerCase())
    return !inQuick && matchSearch
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon name="code-branch" className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Análise de Branch</h2>
              <p className="text-violet-100 text-xs mt-0.5">
                Compare com a base · visualize arquivos alterados · receba avaliação de risco por IA
              </p>
            </div>
          </div>
          {currentBranch && (
            <div className="sm:ml-auto flex items-center gap-1.5 text-xs bg-white/15 border border-white/20 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-white/80">HEAD:</span>
              <span className="font-mono font-bold">{currentBranch}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick access branches */}
      {quickBranches.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
            Branches principais
          </p>
          <div className="flex flex-wrap gap-2">
            {quickBranches.map(b => (
              <BranchChip
                key={b}
                name={b}
                isCurrent={b === currentBranch}
                isSelected={branch === b}
                onClick={() => {
                  setBranch(b)
                  inputRef.current?.focus()
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Branch a analisar
            </label>
            <input
              ref={inputRef}
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="ex: feature/minha-feature"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              onKeyDown={e => e.key === "Enter" && handleAnalyse()}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Base (comparar com)
            </label>
            <input
              value={base}
              onChange={e => setBase(e.target.value)}
              placeholder="main"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => handleAnalyse()}
            disabled={loading || !branch.trim()}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors shrink-0"
          >
            {loading
              ? <ThinkingDots label="Analisando" />
              : <><Icon name="magnifying-glass-chart" /> Analisar</>
            }
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* All branches list */}
      {branches.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <Icon name="code-branch" className="text-violet-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Todas as branches
            </span>
            <span className="text-xs text-gray-400 ml-auto">{branches.length} total</span>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]" />
              <input
                value={branchSearch}
                onChange={e => setBranchSearch(e.target.value)}
                placeholder="Buscar branch..."
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
              {branchSearch && (
                <button
                  onClick={() => setBranchSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="xmark" className="text-[10px]" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          {loadingBranches ? (
            <div className="py-6 flex justify-center">
              <ThinkingDots label="Carregando branches" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-5">
              {branchSearch ? "Nenhuma branch encontrada." : "Sem branches adicionais."}
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
              {filteredBranches.map((b, i) => (
                <motion.button
                  key={b}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  onClick={() => {
                    setBranch(b)
                    inputRef.current?.focus()
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors group ${
                    branch === b ? "bg-violet-50 dark:bg-violet-900/20" : ""
                  }`}
                >
                  <Icon
                    name="code-branch"
                    className={`shrink-0 text-[11px] ${branch === b ? "text-violet-600" : "text-gray-300 group-hover:text-violet-400"}`}
                  />
                  <span className={`text-xs font-mono truncate ${branch === b ? "text-violet-700 dark:text-violet-300 font-semibold" : "text-gray-600 dark:text-gray-400"}`}>
                    {b}
                  </span>
                  {b === currentBranch && (
                    <span className="ml-auto shrink-0 text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-1.5 py-0.5 rounded-full">
                      HEAD
                    </span>
                  )}
                  <Icon
                    name="arrow-right"
                    className={`ml-auto shrink-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-violet-400 ${b === currentBranch ? "ml-1" : ""}`}
                  />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {!loading && result && <ResultPanel result={result} />}
      </AnimatePresence>
    </div>
  )
}


interface Props {
  repositoryId: string
  status: string
}

function RiskBar({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-red-500" :
    score >= 50 ? "bg-orange-500" :
    score >= 25 ? "bg-yellow-500" :
    "bg-emerald-500"
  const label =
    score >= 75 ? "Risco Alto" :
    score >= 50 ? "Risco Médio" :
    score >= 25 ? "Risco Baixo" :
    "Risco Mínimo"
  const textColor =
    score >= 75 ? "text-red-700 dark:text-red-300" :
    score >= 50 ? "text-orange-700 dark:text-orange-300" :
    score >= 25 ? "text-yellow-700 dark:text-yellow-300" :
    "text-emerald-700 dark:text-emerald-300"

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-bold ${textColor}`}>{label}</span>
        <span className="text-gray-500">{score.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

function MarkdownPreview({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  )
}
