import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    getImpactAnalysis,
    getGraphModules,
    type ImpactEntry,
    type ImpactAnalysis,
    type ModuleItem,
} from "../../services/impactApi"
import {
    Card,
    ThinkingDots,
    EmptyState,
    ErrorBanner,
    btnSecondary,
    Icon,
} from "../ui"
import { useI18n } from "../../i18n"

interface Props {
    repositoryId: string
    status: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const RECENT_KEY = (repoId: string) => `impact_recent_${repoId}`
const MAX_RECENT = 6

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

// ── Module type badge (shared pattern from TourTab) ────────────────────────

function moduleTypeBadge(name: string): { label: string; cls: string } {
    const n = name.toLowerCase()
    if (n.includes("controller") || n.includes("route") || n.includes("handler"))
        return { label: "Controller", cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" }
    if (n.includes("service") || n.includes("use-case") || n.includes("usecase"))
        return { label: "Service", cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" }
    if (n.includes("model") || n.includes("entity") || n.includes("schema") || n.includes("domain"))
        return { label: "Model", cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" }
    if (n.includes("util") || n.includes("helper") || n.includes("common") || n.includes("shared"))
        return { label: "Utilitário", cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" }
    if (n.includes("module") || n.includes("core") || n.includes("app") || n.includes("main"))
        return { label: "Core", cls: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" }
    if (n.includes("guard") || n.includes("middleware") || n.includes("interceptor"))
        return { label: "Middleware", cls: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" }
    if (n.includes("infra") || n.includes("repository") || n.includes("adapter") || n.includes("client"))
        return { label: "Infra", cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" }
    return { label: "Módulo", cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" }
}

// ── Fuzzy match ────────────────────────────────────────────────────────────

function matchesQuery(item: ModuleItem, query: string): boolean {
    if (!query) return true
    const q = query.toLowerCase()
    return item.module_path.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
}

// ── localStorage helpers ───────────────────────────────────────────────────

function loadRecent(repoId: string): string[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY(repoId)) ?? "[]") }
    catch { return [] }
}

function saveRecent(repoId: string, modulePath: string) {
    const prev = loadRecent(repoId).filter((m) => m !== modulePath)
    localStorage.setItem(RECENT_KEY(repoId), JSON.stringify([modulePath, ...prev].slice(0, MAX_RECENT)))
}

// ── ModuleCombobox ─────────────────────────────────────────────────────────

interface ComboboxProps {
    value: string
    onChange: (v: string) => void
    onSubmit: () => void
    repositoryId: string
    modules: ModuleItem[]
    loadingModules: boolean
}

function ModuleCombobox({ value, onChange, onSubmit, repositoryId, modules, loadingModules }: ComboboxProps) {
    const [open, setOpen] = useState(false)
    const [cursor, setCursor] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const recent = loadRecent(repositoryId)

    const filtered = modules.filter((m) => matchesQuery(m, value))
    const showRecent = !value && recent.length > 0
    const recentItems = showRecent
        ? modules.filter((m) => recent.includes(m.module_path))
            .sort((a, b) => recent.indexOf(a.module_path) - recent.indexOf(b.module_path))
        : []
    const suggestions = showRecent ? recentItems : filtered.slice(0, 40)

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!open) { if (e.key === "ArrowDown") setOpen(true); return }
        if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, suggestions.length - 1)) }
        else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, -1)) }
        else if (e.key === "Enter") {
            e.preventDefault()
            if (cursor >= 0 && suggestions[cursor]) { select(suggestions[cursor].module_path) }
            else { setOpen(false); onSubmit() }
        } else if (e.key === "Escape") { setOpen(false) }
    }

    function select(modulePath: string) {
        onChange(modulePath); setOpen(false); setCursor(-1); inputRef.current?.blur()
    }

    useEffect(() => {
        if (cursor >= 0 && listRef.current) {
            (listRef.current.children[cursor] as HTMLElement)?.scrollIntoView({ block: "nearest" })
        }
    }, [cursor])

    const sectionLabel = showRecent
        ? "Recentes"
        : value
        ? `${filtered.length} módulo${filtered.length !== 1 ? "s" : ""}`
        : "Mais impactantes (por in-degree)"

    return (
        <div ref={wrapperRef} className="relative flex-1">
            <div className={`flex items-center gap-2 rounded-xl border bg-white dark:bg-gray-900 px-3 py-2.5 transition-all ${open ? "border-rose-400 ring-2 ring-rose-300/40" : "border-rose-200 dark:border-rose-700"}`}>
                <Icon name={loadingModules ? "spinner" : "code-branch"} className={`text-gray-400 text-xs shrink-0 ${loadingModules ? "animate-spin" : ""}`} />
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => { onChange(e.target.value); setCursor(-1); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar módulo… ex: auth_service, utils/db"
                    className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none min-w-0"
                />
                {value && (
                    <button onClick={() => { onChange(""); setCursor(-1); inputRef.current?.focus() }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                        <Icon name="xmark" className="text-xs" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
                    >
                        <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sectionLabel}</span>
                            {showRecent && <span className="text-[9px] text-gray-400 flex items-center gap-1"><Icon name="clock-rotate-left" className="text-[9px]" /> histórico</span>}
                        </div>
                        {suggestions.length === 0 && (
                            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {loadingModules ? "Carregando módulos…" : "Nenhum módulo encontrado"}
                            </p>
                        )}
                        <ul ref={listRef} className="max-h-64 overflow-y-auto">
                            {suggestions.map((item, i) => {
                                const badge = moduleTypeBadge(item.module_path)
                                const isActive = i === cursor
                                const shortPath = item.module_path.split("/").pop() ?? item.module_path
                                const parentPath = item.module_path.includes("/") ? item.module_path.split("/").slice(0, -1).join("/") : ""
                                return (
                                    <li key={item.id}>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); select(item.module_path) }}
                                            className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${isActive ? "bg-rose-50 dark:bg-rose-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                        >
                                            <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{shortPath}</p>
                                                {parentPath && <p className="text-[10px] text-gray-400 truncate font-mono">{parentPath}/</p>}
                                            </div>
                                            <div className="shrink-0 flex items-center gap-2 text-[10px]">
                                                {item.in_degree > 0 && (
                                                    <span className="flex items-center gap-0.5 text-rose-500 dark:text-rose-400 font-mono" title={`${item.in_degree} módulo(s) dependem deste`}>
                                                        <Icon name="arrow-down-to-bracket" className="text-[8px]" />{item.in_degree}
                                                    </span>
                                                )}
                                                {item.out_degree > 0 && (
                                                    <span className="flex items-center gap-0.5 text-indigo-400 font-mono" title={`usa ${item.out_degree} módulo(s)`}>
                                                        <Icon name="arrow-up-from-bracket" className="text-[8px]" />{item.out_degree}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                        {!showRecent && !value && filtered.length > 40 && (
                            <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
                                +{filtered.length - 40} módulos — use a busca para filtrar
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Hub chips ──────────────────────────────────────────────────────────────

function HubChips({ modules, onSelect }: { modules: ModuleItem[]; onSelect: (m: string) => void }) {
    const hubs = modules.filter((m) => m.in_degree > 0).slice(0, 8)
    if (hubs.length === 0) return null
    return (
        <div className="mt-3 pt-3 border-t border-rose-100 dark:border-rose-900/40">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Icon name="fire" className="text-rose-400" /> Módulos mais impactantes — clique para analisar
            </p>
            <div className="flex flex-wrap gap-2">
                {hubs.map((m) => {
                    const badge = moduleTypeBadge(m.module_path)
                    const shortName = m.module_path.split("/").pop() ?? m.module_path
                    return (
                        <button key={m.id} onClick={() => onSelect(m.module_path)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-900 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-xs group"
                            title={m.module_path}
                        >
                            <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 truncate max-w-[120px]">{shortName}</span>
                            <span className="text-[10px] text-rose-500 dark:text-rose-400 font-mono shrink-0 flex items-center gap-0.5">
                                <Icon name="arrow-down-to-bracket" className="text-[8px]" />{m.in_degree}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Impact entry row ───────────────────────────────────────────────────────

function ImpactEntryRow({ entry, onAnalyze }: { entry: ImpactEntry; onAnalyze: (path: string) => void }) {
    const badge = moduleTypeBadge(entry.module_path)
    return (
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${distanceColor(entry.distance)} group`}
        >
            <div className="shrink-0 w-6 h-6 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center text-xs font-bold">
                {entry.distance}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-mono font-semibold truncate">{entry.module_path}</p>
                    <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                </div>
                <p className="text-[10px] opacity-70 truncate">{entry.label}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
                {entry.direct && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20">direto</span>
                )}
                <button
                    onClick={() => onAnalyze(entry.module_path)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium px-2 py-1 rounded-lg bg-white/70 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 flex items-center gap-1"
                    title="Analisar impacto deste módulo"
                >
                    <Icon name="circle-nodes" className="text-[9px]" /> Ver impacto
                </button>
            </div>
        </motion.div>
    )
}

// ── Main component ─────────────────────────────────────────────────────────

export function ImpactTab({ repositoryId, status }: Props) {
    const { t } = useI18n()
    const [pendingModule, setPendingModule] = useState("")
    const [module, setModule] = useState("")
    const [maxDepth, setMaxDepth] = useState(5)
    const [result, setResult] = useState<ImpactAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | undefined>()
    const [searched, setSearched] = useState(false)
    const [filterDirect, setFilterDirect] = useState(false)
    const [modules, setModules] = useState<ModuleItem[]>([])
    const [loadingModules, setLoadingModules] = useState(false)
    const modulesLoaded = useRef(false)

    useEffect(() => {
        if (status !== "completed" || modulesLoaded.current) return
        modulesLoaded.current = true
        setLoadingModules(true)
        getGraphModules(repositoryId)
            .then(setModules)
            .catch(() => {})
            .finally(() => setLoadingModules(false))
    }, [repositoryId, status])

    async function runAnalysis(modulePath: string) {
        const m = modulePath.trim()
        if (!m) return
        setPendingModule(m)
        setModule(m)
        setLoading(true)
        setError(undefined)
        setResult(null)
        setSearched(true)
        saveRecent(repositoryId, m)
        try {
            setResult(await getImpactAnalysis(repositoryId, m, maxDepth))
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Falha na análise de impacto.")
        } finally {
            setLoading(false)
        }
    }

    if (status !== "completed") {
        return (
            <Card>
                <EmptyState icon="circle-nodes" title="Indexe um repositório primeiro"
                    description="A análise de impacto estará disponível após a indexação ser concluída." />
            </Card>
        )
    }

    const displayed = result ? (filterDirect ? result.affected.filter((e) => e.direct) : result.affected) : []
    const byDistance = displayed.reduce<Record<number, ImpactEntry[]>>((acc, e) => {
        ;(acc[e.distance] ??= []).push(e); return acc
    }, {})
    const directCount = result?.affected.filter((e) => e.direct).length ?? 0

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-md shadow-rose-200 dark:shadow-rose-900/40 shrink-0">
                        <Icon name="circle-nodes" className="text-white text-base" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Análise de Impacto</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">"Se eu alterar este módulo, o que mais pode ser afetado?"</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <ModuleCombobox
                        value={pendingModule}
                        onChange={setPendingModule}
                        onSubmit={() => runAnalysis(pendingModule)}
                        repositoryId={repositoryId}
                        modules={modules}
                        loadingModules={loadingModules}
                    />
                    <select value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))}
                        className="text-sm rounded-xl border border-rose-200 dark:border-rose-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-400 shrink-0">
                        {[2, 3, 5, 7, 10].map((n) => <option key={n} value={n}>Profundidade {n}</option>)}
                    </select>
                    <button onClick={() => runAnalysis(pendingModule)} disabled={loading || !pendingModule.trim()}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-colors shrink-0">
                        {loading ? <><Icon name="spinner" className="animate-spin" /> Analisando…</> : <><Icon name="bolt" /> Analisar</>}
                    </button>
                </div>

                {!searched && <HubChips modules={modules} onSelect={(m) => { setPendingModule(m); runAnalysis(m) }} />}
            </div>

            {error && <ErrorBanner message={error} />}

            {loading && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-12 flex justify-center">
                    <ThinkingDots label="Percorrendo o grafo de dependências…" />
                </div>
            )}

            {!loading && searched && result && result.affected_count === 0 && (
                <Card>
                    <EmptyState icon="circle-check" title="Nenhum módulo afetado"
                        description={`Nenhum módulo depende de "${module}". É um módulo folha isolado — pode ser alterado com baixo risco de cascata.`} />
                </Card>
            )}

            {!loading && result && result.affected_count > 0 && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                                <Icon name="code-branch" className="text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={module}>{module.split("/").pop()}</p>
                                <p className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">{module}</p>
                            </div>
                        </div>
                        <Icon name="arrow-right" className="text-gray-300 dark:text-gray-600 hidden sm:block" />
                        {[
                            { icon: "triangle-exclamation", bg: "bg-rose-100 dark:bg-rose-900/40", iconCls: "text-rose-600 dark:text-rose-400", value: result.affected_count, label: "módulos afetados" },
                            { icon: "circle-nodes", bg: "bg-orange-100 dark:bg-orange-900/40", iconCls: "text-orange-600 dark:text-orange-400", value: directCount, label: "diretas" },
                            { icon: "layer-group", bg: "bg-indigo-100 dark:bg-indigo-900/40", iconCls: "text-indigo-600 dark:text-indigo-400", value: result.max_depth_reached, label: "profundidade" },
                        ].map(({ icon, bg, iconCls, value, label }) => (
                            <div key={label} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}><Icon name={icon} className={iconCls} /></div>
                                <div><p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p><p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p></div>
                            </div>
                        ))}
                        <div className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold border ${
                            result.affected_count > 20 ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                            : result.affected_count > 8 ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
                            : "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"}`}>
                            <Icon name={result.affected_count > 20 ? "triangle-exclamation" : result.affected_count > 8 ? "circle-exclamation" : "circle-check"} className="mr-1" />
                            Risco {result.affected_count > 20 ? "Alto" : result.affected_count > 8 ? "Médio" : "Baixo"}
                        </div>
                        <button onClick={() => setFilterDirect((f) => !f)} className={`${btnSecondary} text-xs`}>
                            <Icon name={filterDirect ? "eye-slash" : "eye"} />
                            {filterDirect ? "Mostrar todos" : "Só diretos"}
                        </button>
                    </div>

                    {/* Results by distance */}
                    {Object.entries(byDistance).sort(([a], [b]) => Number(a) - Number(b)).map(([dist, entries]) => (
                        <div key={dist}>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${distanceColor(Number(dist))}`}>{dist}</span>
                                {Number(dist) === 1 ? "Dependências diretas" : `Nível ${dist} (transitivo)`}
                                <span className="text-gray-400">({entries.length})</span>
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {entries.map((e) => (
                                    <ImpactEntryRow key={e.module_path} entry={e}
                                        onAnalyze={(m) => { setPendingModule(m); runAnalysis(m) }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


