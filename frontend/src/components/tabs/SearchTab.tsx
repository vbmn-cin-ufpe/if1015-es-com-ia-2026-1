import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { semanticSearch, type SearchResult } from "../../services/codeSearchApi"
import {
  Card,
  ThinkingDots,
  EmptyState,
  ErrorBanner,
  btnPrimary,
  Icon,
  inputCls,
} from "../ui"

interface Props {
  repositoryId: string
  status: string
}

// Language colour map
const LANG_COLORS: Record<string, string> = {
  python:     "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  typescript: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
  javascript: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  java:       "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  go:         "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
  rust:       "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  csharp:     "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
}

function langColor(lang: string) {
  return LANG_COLORS[lang.toLowerCase()] ?? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
}

function scoreBar(score: number) {
  const pct = Math.round(score * 100)
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"
  return { pct, color }
}

function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const [expanded, setExpanded] = useState(false)
  const { pct, color } = scoreBar(result.score)

  // highlight the query term in the snippet
  function highlight(text: string) {
    if (!query.trim()) return <>{text}</>
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return <>{text}</>
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-700/60 rounded px-0.5">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  const fileName = result.file_path.split("/").pop() ?? result.file_path

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <Icon name="file-code" className="text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {fileName}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate font-mono">
            {result.file_path}
            {result.start_line > 0 && (
              <span className="ml-2 text-indigo-500">L{result.start_line}–{result.end_line}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {result.language && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${langColor(result.language)}`}>
              {result.language}
            </span>
          )}
          {/* Score bar */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
          </div>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} className="text-gray-400 text-xs" />
        </div>
      </div>

      {/* Expanded snippet */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <pre className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-700 whitespace-pre-wrap break-all overflow-hidden">
              {highlight(result.snippet)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function SearchTab({ repositoryId, status }: Props) {
  const [query, setQuery] = useState("")
  const [pendingQuery, setPendingQuery] = useState("")
  const [topK, setTopK] = useState(10)
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)

  async function onSearch() {
    const q = pendingQuery.trim()
    if (!q) return
    setQuery(q)
    setLoading(true)
    setError("")
    setResults([])
    setSearched(true)
    try {
      const r = await semanticSearch(repositoryId, q, topK)
      setResults(r.results)
      setTotal(r.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha na busca semântica.")
    } finally {
      setLoading(false)
    }
  }

  if (status !== "completed") {
    return (
      <Card>
        <EmptyState
          icon="magnifying-glass"
          title="Indexe um repositório primeiro"
          description="A busca semântica estará disponível após a indexação ser concluída."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-emerald-900/40 shrink-0">
            <Icon name="magnifying-glass" className="text-white text-base" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Busca Semântica Global</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Encontre qualquer trecho de código por conceito, função ou comportamento
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
            <input
              value={pendingQuery}
              onChange={(e) => setPendingQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSearch() }}
              placeholder="Ex: autenticação JWT, handler de upload, validação de email, cache Redis…"
              className="w-full text-sm rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
            />
          </div>

          {/* Top-K selector */}
          <select
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="text-sm rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>

          <button
            onClick={onSearch}
            disabled={loading || !pendingQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
          >
            {loading
              ? <><Icon name="spinner" className="animate-spin" /> Buscando…</>
              : <><Icon name="magnifying-glass" /> Buscar</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-12 flex justify-center">
          <ThinkingDots label="Buscando no código-fonte com embeddings semânticos…" />
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length === 0 && !error && (
        <Card>
          <EmptyState
            icon="circle-question"
            title="Nenhum resultado encontrado"
            description={`Não há trechos similares a "${query}". Tente outros termos ou conceitos.`}
          />
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-100">{total}</strong> resultados para{" "}
              <span className="font-mono text-emerald-600 dark:text-emerald-400">"{query}"</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Clique em um resultado para ver o trecho de código
            </p>
          </div>

          <AnimatePresence mode="popLayout">
            {results.map((r) => (
              <ResultCard key={r.chunk_id} result={r} query={query} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
