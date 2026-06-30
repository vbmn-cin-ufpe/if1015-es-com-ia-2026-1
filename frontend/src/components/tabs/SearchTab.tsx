import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import SyntaxHighlighter from "react-syntax-highlighter"
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs"
import { semanticSearch, type SearchResult } from "../../services/codeSearchApi"
import {
    Card,
    ThinkingDots,
    EmptyState,
    ErrorBanner,
    Icon,
} from "../ui"

interface Props {
    repositoryId: string
    status: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const HISTORY_KEY = (repoId: string) => `search_history_${repoId}`
const MAX_HISTORY = 8

const EXAMPLE_QUERIES = [
    "autenticação JWT",
    "conexão com banco de dados",
    "validação de entrada",
    "tratamento de erros",
    "upload de arquivos",
    "cache em memória",
    "configuração de ambiente",
    "middleware de logging",
]

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normalize ChromaDB score to [0, 1] regardless of whether it's a
 *  cosine distance (negative) or a similarity (positive). */
function normalizeScore(score: number): number {
    if (score <= 0) return Math.max(0, 1 + score) // e.g. −0.31 → 0.69
    return Math.min(score, 1)
}

function scoreLabel(norm: number): { pct: number; color: string; label: string } {
    const pct = Math.round(norm * 100)
    if (pct >= 80) return { pct, color: "bg-emerald-500", label: "Alta" }
    if (pct >= 60) return { pct, color: "bg-amber-400",  label: "Média" }
    return             { pct, color: "bg-red-400",     label: "Baixa" }
}

function langForHighlighter(lang: string): string {
    const MAP: Record<string, string> = {
        python: "python", typescript: "typescript", javascript: "javascript",
        java: "java", go: "go", rust: "rust", csharp: "csharp",
        cpp: "cpp", c: "c", ruby: "ruby", php: "php", swift: "swift",
        kotlin: "kotlin", scala: "scala", shell: "bash", bash: "bash",
        yaml: "yaml", json: "json", html: "html", css: "css", sql: "sql",
    }
    return MAP[lang?.toLowerCase()] ?? "plaintext"
}

function loadHistory(repoId: string): string[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY(repoId)) ?? "[]") }
    catch { return [] }
}

function saveHistory(repoId: string, query: string) {
    const prev = loadHistory(repoId).filter((q) => q !== query)
    localStorage.setItem(HISTORY_KEY(repoId), JSON.stringify([query, ...prev].slice(0, MAX_HISTORY)))
}

function clearHistory(repoId: string) {
    localStorage.removeItem(HISTORY_KEY(repoId))
}

async function copyToClipboard(text: string): Promise<boolean> {
    try { await navigator.clipboard.writeText(text); return true }
    catch { return false }
}

// ── CodePane — syntax-highlighted code viewer ──────────────────────────────

function CodePane({
    snippet, language, startLine, filePath,
}: {
    snippet: string
    language: string
    startLine: number
    filePath: string
}) {
    const [copied, setCopied] = useState<"code" | "path" | null>(null)

    async function copy(what: "code" | "path") {
        const text = what === "code" ? snippet : filePath
        const ok = await copyToClipboard(text)
        if (ok) { setCopied(what); setTimeout(() => setCopied(null), 1800) }
    }

    const lineCount = snippet.split("\n").length

    return (
        <div className="border-t border-[#3c3c3c] bg-[#1e1e1e]">
            {/* Code pane toolbar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center gap-2 min-w-0">
                    <Icon name="file-code" className="text-[#569cd6] text-xs shrink-0" />
                    <span className="text-[11px] text-[#d4d4d4] font-mono truncate" title={filePath}>{filePath}</span>
                    {startLine > 0 && (
                        <span className="shrink-0 text-[10px] text-[#569cd6] font-mono bg-[#1e3a5f]/50 px-1.5 py-0.5 rounded">
                            L{startLine} · {lineCount} linhas
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => copy("path")}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#d4d4d4] transition-colors"
                        title="Copiar caminho"
                    >
                        <Icon name={copied === "path" ? "check" : "copy"} className="text-[9px]" />
                        {copied === "path" ? "Copiado!" : "Caminho"}
                    </button>
                    <button
                        onClick={() => copy("code")}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#d4d4d4] transition-colors"
                        title="Copiar código"
                    >
                        <Icon name={copied === "code" ? "check" : "clipboard"} className="text-[9px]" />
                        {copied === "code" ? "Copiado!" : "Código"}
                    </button>
                </div>
            </div>

            {/* Code block */}
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto text-xs">
                <SyntaxHighlighter
                    language={langForHighlighter(language)}
                    style={atomOneDark}
                    showLineNumbers
                    startingLineNumber={startLine > 0 ? startLine : 1}
                    wrapLongLines={false}
                    customStyle={{
                        margin: 0,
                        padding: "12px 16px",
                        background: "#1e1e1e",
                        fontSize: "12px",
                        lineHeight: "1.6",
                    }}
                    lineNumberStyle={{ color: "#6e7681", minWidth: "3em", paddingRight: "1em", userSelect: "none" }}
                >
                    {snippet}
                </SyntaxHighlighter>
            </div>
        </div>
    )
}

// ── ResultCard ─────────────────────────────────────────────────────────────

function ResultCard({
    result, query, index, onAskInChat,
}: {
    result: SearchResult
    query: string
    index: number
    onAskInChat: (result: SearchResult) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const norm = normalizeScore(result.score)
    const { pct, color, label } = scoreLabel(norm)

    const fileName = result.file_path.split("/").pop() ?? result.file_path
    const dirPath  = result.file_path.includes("/")
        ? result.file_path.split("/").slice(0, -1).join("/") + "/"
        : ""

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
            {/* Card header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors select-none"
                onClick={() => setExpanded((e) => !e)}
            >
                {/* Rank badge */}
                <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    {index + 1}
                </span>

                {/* File info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fileName}</p>
                        {result.language && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                result.language === "python"     ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" :
                                result.language === "typescript" ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" :
                                result.language === "javascript" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300" :
                                result.language === "java"       ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" :
                                result.language === "go"         ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300" :
                                result.language === "rust"       ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" :
                                "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}>{result.language}</span>
                        )}
                        {result.start_line > 0 && (
                            <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                                L{result.start_line}–{result.end_line}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">
                        <span className="text-gray-300 dark:text-gray-600">{dirPath}</span>
                        <span className="text-gray-500 dark:text-gray-400">{fileName}</span>
                    </p>
                </div>

                {/* Score + controls */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 w-7 text-right font-mono">{pct}%</span>
                        </div>
                        <span className={`text-[9px] font-medium ${pct >= 80 ? "text-emerald-500" : pct >= 60 ? "text-amber-500" : "text-red-400"}`}>
                            {label}
                        </span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAskInChat(result) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Perguntar sobre este arquivo no Chat"
                    >
                        <Icon name="comments" className="text-xs" />
                    </button>
                    <Icon name={expanded ? "chevron-up" : "chevron-down"} className="text-gray-400 text-xs" />
                </div>
            </div>

            {/* Expanded code pane */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ overflow: "hidden" }}
                    >
                        <CodePane
                            snippet={result.snippet}
                            language={result.language}
                            startLine={result.start_line}
                            filePath={result.file_path}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ── Grouped results ────────────────────────────────────────────────────────

function FileGroup({
    filePath, results, query, onAskInChat,
}: {
    filePath: string
    results: SearchResult[]
    query: string
    onAskInChat: (r: SearchResult) => void
}) {
    const [open, setOpen] = useState(true)
    const fileName = filePath.split("/").pop() ?? filePath
    const best = normalizeScore(results[0].score)
    const { pct, color } = scoreLabel(best)
    const lang = results[0].language

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            {/* File header */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
            >
                <Icon name="file-code" className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fileName}</span>
                        {lang && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                {lang}
                            </span>
                        )}
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {results.length} trecho{results.length > 1 ? "s" : ""}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{filePath}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <Icon name={open ? "chevron-up" : "chevron-down"} className="text-gray-400 text-xs" />
                </div>
            </button>

            {/* Chunks for this file */}
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                        {results.map((r, i) => (
                            <div key={r.chunk_id} className={`border-t border-gray-100 dark:border-gray-700 ${i > 0 ? "border-dashed" : ""}`}>
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-gray-900/30">
                                    {r.start_line > 0 && (
                                        <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                                            L{r.start_line}–{r.end_line}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-gray-400">
                                        relevância {Math.round(normalizeScore(r.score) * 100)}%
                                    </span>
                                    <button
                                        onClick={() => onAskInChat(r)}
                                        className="ml-auto text-[10px] text-gray-400 hover:text-indigo-500 flex items-center gap-1"
                                        title="Perguntar sobre este trecho no Chat"
                                    >
                                        <Icon name="comments" className="text-[9px]" /> Chat
                                    </button>
                                </div>
                                <CodePane snippet={r.snippet} language={r.language} startLine={r.start_line} filePath={r.file_path} />
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── SearchHistoryBar ───────────────────────────────────────────────────────

function SearchHistoryBar({
    repositoryId, onSelect, onClear,
}: {
    repositoryId: string
    onSelect: (q: string) => void
    onClear: () => void
}) {
    const history = loadHistory(repositoryId)
    const chips = history.length > 0 ? history : EXAMPLE_QUERIES.slice(0, 6)
    const isHistory = history.length > 0

    return (
        <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Icon name={isHistory ? "clock-rotate-left" : "lightbulb"} className="text-[10px]" />
                    {isHistory ? "Buscas recentes" : "Exemplos de busca"}
                </p>
                {isHistory && (
                    <button onClick={onClear} className="text-[10px] text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1">
                        <Icon name="trash" className="text-[9px]" /> Limpar
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {chips.map((q) => (
                    <button key={q} onClick={() => onSelect(q)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
                    >
                        {isHistory && <Icon name="rotate-left" className="text-[9px] text-emerald-400" />}
                        {q}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ── Main component ─────────────────────────────────────────────────────────

export function SearchTab({ repositoryId, status }: Props) {
    const navigate = useNavigate()
    const [query, setQuery] = useState("")
    const [pendingQuery, setPendingQuery] = useState("")
    const [topK, setTopK] = useState(10)
    const [results, setResults] = useState<SearchResult[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | undefined>()
    const [searched, setSearched] = useState(false)
    const [groupByFile, setGroupByFile] = useState(false)
    const [historyVersion, setHistoryVersion] = useState(0) // forces re-render on history change

    async function onSearch(q?: string) {
        const term = (q ?? pendingQuery).trim()
        if (!term) return
        setPendingQuery(term)
        setQuery(term)
        setLoading(true)
        setError(undefined)
        setResults([])
        setSearched(true)
        saveHistory(repositoryId, term)
        setHistoryVersion((v) => v + 1)
        try {
            const r = await semanticSearch(repositoryId, term, topK)
            setResults(r.results)
            setTotal(r.total)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Falha na busca semântica.")
        } finally {
            setLoading(false)
        }
    }

    function onAskInChat(result: SearchResult) {
        const question = `Explique o trecho em \`${result.file_path}\` (L${result.start_line}–${result.end_line})`
        sessionStorage.setItem("chat_prefill", question)
        navigate("/chat")
    }

    function handleClearHistory() {
        clearHistory(repositoryId)
        setHistoryVersion((v) => v + 1)
    }

    // Group results by file_path
    const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        ;(acc[r.file_path] ??= []).push(r)
        return acc
    }, {})

    if (status !== "completed") {
        return (
            <Card>
                <EmptyState icon="magnifying-glass" title="Indexe um repositório primeiro"
                    description="A busca semântica estará disponível após a indexação ser concluída." />
            </Card>
        )
    }

    return (
        <div className="space-y-4">
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
                            placeholder="Ex: autenticação JWT, handler de upload, validação de email…"
                            className="w-full text-sm rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
                        />
                    </div>
                    <select value={topK} onChange={(e) => setTopK(Number(e.target.value))}
                        className="text-sm rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 shrink-0">
                        {[5, 10, 20, 50].map((n) => <option key={n} value={n}>Top {n}</option>)}
                    </select>
                    <button onClick={() => onSearch()} disabled={loading || !pendingQuery.trim()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-colors shrink-0">
                        {loading ? <><Icon name="spinner" className="animate-spin" /> Buscando…</> : <><Icon name="magnifying-glass" /> Buscar</>}
                    </button>
                </div>

                {/* History / example chips */}
                <SearchHistoryBar
                    key={historyVersion}
                    repositoryId={repositoryId}
                    onSelect={(q) => onSearch(q)}
                    onClear={handleClearHistory}
                />
            </div>

            {error && <ErrorBanner message={error} />}

            {loading && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-12 flex justify-center">
                    <ThinkingDots label="Buscando no código-fonte com embeddings semânticos…" />
                </div>
            )}

            {!loading && searched && results.length === 0 && !error && (
                <Card>
                    <EmptyState icon="circle-question" title="Nenhum resultado encontrado"
                        description={`Não há trechos similares a "${query}". Tente outros termos ou conceitos.`} />
                </Card>
            )}

            {!loading && results.length > 0 && (
                <div className="space-y-3">
                    {/* Results toolbar */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            <strong className="text-gray-900 dark:text-gray-100">{total}</strong> resultados para{" "}
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">"{query}"</span>
                            {groupByFile && (
                                <span className="ml-2 text-gray-400">em <strong className="text-gray-700 dark:text-gray-300">{Object.keys(grouped).length}</strong> arquivo{Object.keys(grouped).length !== 1 ? "s" : ""}</span>
                            )}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Clique para expandir e ver o código</span>
                            <button
                                onClick={() => setGroupByFile((g) => !g)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                                    groupByFile
                                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                                }`}
                            >
                                <Icon name={groupByFile ? "layer-group" : "list"} />
                                {groupByFile ? "Por arquivo" : "Por relevância"}
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    <AnimatePresence mode="popLayout">
                        {groupByFile
                            ? Object.entries(grouped).map(([fp, items]) => (
                                <FileGroup key={fp} filePath={fp} results={items} query={query} onAskInChat={onAskInChat} />
                            ))
                            : results.map((r, i) => (
                                <ResultCard key={r.chunk_id} result={r} query={query} index={i} onAskInChat={onAskInChat} />
                            ))
                        }
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}



