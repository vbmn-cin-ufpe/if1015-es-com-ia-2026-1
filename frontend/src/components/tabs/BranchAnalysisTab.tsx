import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Card,
  EmptyState,
  ThinkingDots,
  ErrorBanner,
  Icon,
  btnPrimary,
  inputCls,
} from "../ui"
import { analyseBranch, type BranchAnalysisResult } from "../../services/branchApi"
import { fadeUp, fadeUpTransition } from "../../animations"

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

export function BranchAnalysisTab({ repositoryId, status }: Props) {
  const [branch, setBranch] = useState("")
  const [base, setBase] = useState("main")
  const [result, setResult] = useState<BranchAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyse() {
    if (!branch.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await analyseBranch(repositoryId, branch.trim(), base.trim() || "main")
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="code-branch" className="text-2xl" />
          <h2 className="text-xl font-bold">Análise de Branch</h2>
        </div>
        <p className="text-violet-200 text-sm">
          Compare uma feature branch com a base, visualize arquivos alterados e receba um sumário
          de risco gerado por IA.
        </p>
      </div>

      {/* Input */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Branch a analisar
            </label>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="ex: feature/minha-feature"
              className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyse()}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Base (comparar com)
            </label>
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="main"
              className={inputCls}
            />
          </div>
          <button
            onClick={handleAnalyse}
            disabled={loading || !branch.trim()}
            className={btnPrimary}
          >
            {loading ? <ThinkingDots label="Analisando" /> : (
              <><Icon name="magnifying-glass-chart" /> Analisar</>
            )}
          </button>
        </div>
      </Card>

      {error && <ErrorBanner message={error} />}

      <AnimatePresence>
        {result && !loading && (
          <motion.div
            key="result"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={fadeUpTransition}
            className="space-y-4"
          >
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Arquivos alterados", value: result.changed_files.length, icon: "file-pen" },
                { label: "Linhas adicionadas", value: `+${result.added_lines}`, icon: "plus" },
                { label: "Linhas removidas", value: `-${result.removed_lines}`, icon: "minus" },
                { label: "Módulos tocados", value: result.touched_modules.length, icon: "cubes" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center"
                >
                  <Icon name={s.icon} className="text-indigo-500 text-lg mb-1" />
                  <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Risk score */}
            <Card title="Score de Risco">
              <RiskBar score={result.risk_score} />
            </Card>

            {/* Changed files */}
            {result.changed_files.length > 0 && (
              <Card title={`Arquivos alterados (${result.changed_files.length})`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
                  {result.changed_files.map((f) => (
                    <div
                      key={f}
                      className="flex items-center gap-2 text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-400"
                    >
                      <Icon name="file-code" className="text-violet-400 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Git diff stat */}
            {result.diff_stat && (
              <Card title="Estatísticas do diff">
                <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-x-auto max-h-40">
                  {result.diff_stat}
                </pre>
              </Card>
            )}

            {/* LLM summary */}
            <Card title="Resumo da IA">
              <MarkdownPreview text={result.llm_summary} />
            </Card>

            {/* LLM risk notes */}
            <Card title="Notas de risco da IA">
              <MarkdownPreview text={result.llm_risk_notes} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
