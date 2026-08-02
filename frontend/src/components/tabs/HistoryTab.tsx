import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getTimeline,
    getWhyExplanation,
    clearHistoryCache,
    type TimelineEntry,
    type WhyResponse,
} from "../../services/historyApi";
import {
    Card,
    ThinkingDots,
    EmptyState,
    ErrorBanner,
    btnPrimary,
    btnSecondary,
    inputCls,
    Icon,
} from "../ui";
import { useI18n } from "../../i18n";

interface Props {
    repositoryId: string;
    status: string;
}

// ── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, {
    icon: string; label: string;
    bg: string; border: string; text: string; dot: string; badgeBg: string;
}> = {
    bugfix:         { icon: "bug",                 label: "Bugfix",       bg: "bg-red-50 dark:bg-red-950/40",       border: "border-red-200 dark:border-red-800",       text: "text-red-700 dark:text-red-300",       dot: "bg-red-500",      badgeBg: "bg-red-100 dark:bg-red-900/60" },
    feature:        { icon: "wand-magic-sparkles", label: "Feature",      bg: "bg-blue-50 dark:bg-blue-950/40",     border: "border-blue-200 dark:border-blue-800",     text: "text-blue-700 dark:text-blue-300",     dot: "bg-blue-500",     badgeBg: "bg-blue-100 dark:bg-blue-900/60" },
    refactor:       { icon: "arrows-rotate",       label: "Refator",      bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800",  text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500",   badgeBg: "bg-purple-100 dark:bg-purple-900/60" },
    performance:    { icon: "bolt",                label: "Performance",  bg: "bg-amber-50 dark:bg-amber-950/40",   border: "border-amber-200 dark:border-amber-800",   text: "text-amber-700 dark:text-amber-300",   dot: "bg-amber-500",    badgeBg: "bg-amber-100 dark:bg-amber-900/60" },
    documentation:  { icon: "book-open",           label: "Docs",         bg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500",   badgeBg: "bg-yellow-100 dark:bg-yellow-900/60" },
    test:           { icon: "flask",               label: "Testes",       bg: "bg-green-50 dark:bg-green-950/40",   border: "border-green-200 dark:border-green-800",   text: "text-green-700 dark:text-green-300",   dot: "bg-green-500",    badgeBg: "bg-green-100 dark:bg-green-900/60" },
    infrastructure: { icon: "server",              label: "Infra/CI",     bg: "bg-gray-50 dark:bg-gray-800/60",     border: "border-gray-200 dark:border-gray-700",     text: "text-gray-600 dark:text-gray-400",     dot: "bg-gray-500",     badgeBg: "bg-gray-100 dark:bg-gray-700" },
    dependency:     { icon: "cube",                label: "Dependências", bg: "bg-cyan-50 dark:bg-cyan-950/40",     border: "border-cyan-200 dark:border-cyan-800",     text: "text-cyan-700 dark:text-cyan-300",     dot: "bg-cyan-500",     badgeBg: "bg-cyan-100 dark:bg-cyan-900/60" },
    style:          { icon: "palette",             label: "Estilo",       bg: "bg-pink-50 dark:bg-pink-950/40",     border: "border-pink-200 dark:border-pink-800",     text: "text-pink-700 dark:text-pink-300",     dot: "bg-pink-500",     badgeBg: "bg-pink-100 dark:bg-pink-900/60" },
    other:          { icon: "circle-dot",          label: "Outro",        bg: "bg-slate-50 dark:bg-slate-800/60",   border: "border-slate-200 dark:border-slate-700",   text: "text-slate-600 dark:text-slate-400",   dot: "bg-slate-400",    badgeBg: "bg-slate-100 dark:bg-slate-700" },
};

function catConf(cat: string) {
    return CATEGORY_CONFIG[cat.toLowerCase()] ?? CATEGORY_CONFIG.other;
}

const PAGE_SIZE = 1000;        // Load all commits in one shot from backend
const DISPLAY_PAGE_SIZE = 50;  // How many to show per UI page

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortHash(h: string) { return h.slice(0, 7); }

function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(ts: string) {
    return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts: string) {
    const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    if (days === 0) return "hoje";
    if (days === 1) return "ontem";
    if (days < 30) return `${days}d atrás`;
    const m = Math.floor(days / 30);
    return m < 12 ? `${m}m atrás` : `${Math.floor(m / 12)}a atrás`;
}

function monthKey(ts: string) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// ── CommitCard ────────────────────────────────────────────────────────────────

function CommitCard({ entry, onClickModule, searchText }: {
    entry: TimelineEntry;
    onClickModule: (m: string) => void;
    searchText: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const c = catConf(entry.category);

    function highlight(text: string) {
        if (!searchText) return <>{text}</>;
        const idx = text.toLowerCase().indexOf(searchText.toLowerCase());
        if (idx === -1) return <>{text}</>;
        return (
            <>
                {text.slice(0, idx)}
                <mark className="bg-yellow-200 dark:bg-yellow-700/60 rounded px-0.5">{text.slice(idx, idx + searchText.length)}</mark>
                {text.slice(idx + searchText.length)}
            </>
        );
    }

    return (
        <motion.li
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative pl-8"
        >
            {/* Timeline dot */}
            <div className={`absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${c.dot} shadow-sm z-10`} />

            <div
                className={`rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${c.bg} ${c.border}`}
                onClick={() => setExpanded((e) => !e)}
            >
                {/* Main row */}
                <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2.5 flex-wrap">
                    {/* Category badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${c.badgeBg} ${c.border} ${c.text}`}>
                        <Icon name={c.icon} className="text-[9px]" />{c.label}
                    </span>

                    {/* Summary */}
                    <p className={`flex-1 text-sm font-medium leading-snug ${c.text} min-w-0`}>
                        {highlight(entry.summary)}
                    </p>

                    {/* Time + expand */}
                    <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        <span className="hidden sm:block" title={formatDateTime(entry.timestamp)}>{timeAgo(entry.timestamp)}</span>
                        <Icon name="chevron-down" className={`transition-transform duration-200 text-gray-400 ${expanded ? "rotate-180" : ""}`} />
                    </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 px-4 pb-3 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                    <span className="font-mono bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded border border-current border-opacity-15 text-gray-600 dark:text-gray-300">
                        {shortHash(entry.commit_id)}
                    </span>
                    {entry.author && (
                        <span className="flex items-center gap-1">
                            <Icon name="user" className="text-[10px]" />
                            {entry.author}
                        </span>
                    )}
                    <span className="flex items-center gap-1 sm:hidden">
                        <Icon name="clock" className="text-[10px]" />
                        {timeAgo(entry.timestamp)}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                        <Icon name="signal" className="text-[9px]" />
                        <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.round(entry.confidence * 5) ? c.dot : "bg-gray-200 dark:bg-gray-600"}`} />
                            ))}
                        </div>
                        <span className="text-[10px]">{(entry.confidence * 100).toFixed(0)}%</span>
                    </span>
                </div>

                {/* Expanded section */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 pt-1 border-t border-current border-opacity-10">
                                {entry.touched_modules.length > 0 ? (
                                    <>
                                        <p className={`text-xs font-semibold mb-2 ${c.text} flex items-center gap-1.5`}>
                                            <Icon name="folder-open" className="text-[10px]" />
                                            {entry.touched_modules.length} módulo{entry.touched_modules.length > 1 ? "s" : ""} alterado{entry.touched_modules.length > 1 ? "s" : ""}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {entry.touched_modules.map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={(e) => { e.stopPropagation(); onClickModule(m); }}
                                                    title={`Filtrar por ${m}`}
                                                    className={`text-[11px] font-mono px-2 py-0.5 rounded border border-current border-opacity-20 bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors ${c.text} flex items-center gap-1`}
                                                >
                                                    <Icon name="code-branch" className="text-[9px]" />{m}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className={`text-xs italic ${c.text} opacity-60`}>
                                        Nenhum módulo de código-fonte identificado neste commit.
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.li>
    );
}

// ── WhyPanel ──────────────────────────────────────────────────────────────────

function WhyPanel({ repositoryId, initialModule }: { repositoryId: string; initialModule: string }) {
    const [module, setModule] = useState(initialModule);
    const [question, setQuestion] = useState("");
    const [result, setResult] = useState<WhyResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => { if (initialModule) setModule(initialModule); }, [initialModule]);

    async function onAsk() {
        if (!module.trim() || !question.trim()) return;
        setResult(null); setError(""); setLoading(true);
        try { setResult(await getWhyExplanation(repositoryId, module.trim(), question.trim())); }
        catch { setError("Falha ao buscar explicação. Verifique se o módulo possui commits relevantes."); }
        finally { setLoading(false); }
    }

    function onKey(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAsk(); } }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
                    <Icon name="magnifying-glass-chart" className="text-white text-base" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Análise de Mudanças com IA</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Pergunte por que um módulo foi alterado — o modelo analisa o histórico de commits
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Icon name="file-code" className="text-xs" />
                    </span>
                    <input value={module} onChange={(e) => setModule(e.target.value)} onKeyDown={onKey}
                        placeholder="app/services/auth_service.py"
                        className={`${inputCls} pl-8 bg-white dark:bg-gray-900`} />
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Icon name="circle-question" className="text-xs" />
                    </span>
                    <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={onKey}
                        placeholder="Por que este módulo foi refatorado?"
                        className={`${inputCls} pl-8 bg-white dark:bg-gray-900`} />
                </div>
                <button onClick={onAsk} disabled={loading || !module.trim() || !question.trim()} className={btnPrimary}>
                    {loading
                        ? <><Icon name="spinner" className="animate-spin" /> Analisando…</>
                        : <><Icon name="magnifying-glass" /> Explicar</>}
                </button>
            </div>
            {error && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <Icon name="circle-exclamation" /> {error}
                </p>
            )}
            {loading && <div className="mt-4 flex justify-center py-4"><ThinkingDots label="Analisando histórico de commits…" /></div>}
            <AnimatePresence>
                {result && !loading && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white/70 dark:bg-gray-900/70 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                            <Icon name="lightbulb" className="text-indigo-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{result.explanation}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-indigo-400 shrink-0 font-medium">Confiança</span>
                            <div className="flex-1 h-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(result.confidence * 100).toFixed(0)}%` }}
                                    className="h-full bg-indigo-500 rounded-full" />
                            </div>
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0 w-10 text-right">
                                {(result.confidence * 100).toFixed(0)}%
                            </span>
                        </div>
                        {result.supporting_commits.length > 0 && (
                            <details className="group">
                                <summary className="text-xs cursor-pointer select-none text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 list-none font-medium">
                                    <Icon name="chevron-right" className="group-open:rotate-90 transition-transform" />
                                    {result.supporting_commits.length} commit(s) de referência
                                </summary>
                                <ul className="mt-2 space-y-1.5 pl-4">
                                    {result.supporting_commits.map((c) => {
                                        const cc = catConf(c.category);
                                        return (
                                            <li key={c.commit_id} className="flex gap-2 text-xs items-start">
                                                <span className={`font-mono shrink-0 ${cc.text}`}>{shortHash(c.commit_id)}</span>
                                                <Icon name={cc.icon} className={`shrink-0 mt-0.5 ${cc.text}`} />
                                                <span className="text-gray-400 dark:text-gray-500 shrink-0">{formatDate(c.timestamp)}</span>
                                                <span className="text-gray-700 dark:text-gray-300">{c.summary}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </details>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── CategoryDistribution bar ─────────────────────────────────────────────────

function CategoryDistribution({ entries, total, active, onFilter }: {
    entries: TimelineEntry[]; total: number;
    active: string | null; onFilter: (cat: string | null) => void;
}) {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.category] = (counts[e.category] ?? 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] ?? 1;

    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Distribuição por categoria
            </p>
            {sorted.map(([cat, count]) => {
                const c = catConf(cat);
                const pct = (count / max) * 100;
                const isActive = active === cat;
                return (
                    <button
                        key={cat}
                        onClick={() => onFilter(isActive ? null : cat)}
                        className={`w-full text-left group transition-all rounded-lg px-2 py-1.5 ${isActive ? `${c.bg} border ${c.border}` : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Icon name={c.icon} className={`text-xs shrink-0 ${c.text}`} />
                            <span className={`text-xs font-medium flex-1 ${isActive ? c.text : "text-gray-700 dark:text-gray-300"}`}>{c.label}</span>
                            <span className={`text-xs font-bold tabular-nums ${isActive ? c.text : "text-gray-500 dark:text-gray-400"}`}>{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`h-full rounded-full ${c.dot}`}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                            {((count / total) * 100).toFixed(0)}% do total
                        </p>
                    </button>
                );
            })}
        </div>
    );
}

// ── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
    icon: string; label: string; value: string; sub?: string; color: string;
}) {
    return (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
            <div className="w-9 h-9 rounded-lg bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0">
                <Icon name={icon} className="text-base" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-current opacity-70 font-medium">{label}</p>
                <p className="text-lg font-bold truncate leading-tight">{value}</p>
                {sub && <p className="text-[10px] opacity-60 truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ── Month separator ───────────────────────────────────────────────────────────

function MonthSeparator({ label, count }: { label: string; count: number }) {
    return (
        <li className="flex items-center gap-3 pl-8 py-2 sticky top-0 z-10 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm -mx-1 px-3 rounded-lg">
            <Icon name="calendar-days" className="text-gray-400 dark:text-gray-500 text-xs shrink-0" />
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 capitalize">{label}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-600 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{count}</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </li>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function HistoryTab({ repositoryId, status }: Props) {
    const { t } = useI18n();
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [allEntries, setAllEntries] = useState<TimelineEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);

    // Filters
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [moduleFilter, setModuleFilter] = useState("");
    const [pendingModule, setPendingModule] = useState("");
    const [searchText, setSearchText] = useState("");
    const [pendingSearch, setPendingSearch] = useState("");
    const [authorFilter, setAuthorFilter] = useState<string | null>(null);

    // Client-side pagination
    const [displayPage, setDisplayPage] = useState(0);

    // AI search state
    const [aiQuery, setAiQuery] = useState("");
    const [pendingAiQuery, setPendingAiQuery] = useState("");
    const [aiResult, setAiResult] = useState<WhyResponse | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const aiHighlightIds = useMemo(
        () => new Set(aiResult?.supporting_commits.map((c) => c.commit_id) ?? []),
        [aiResult],
    );

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [whyModule, setWhyModule] = useState("");
    const moduleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (status !== "completed") return;
        fetchPage(null, "", 0, true);
    }, [repositoryId, status]);

    async function fetchPage(cat: string | null, mod: string, off: number, reset: boolean, search?: string) {
        if (reset) { setLoading(true); setEntries([]); }
        else setLoadingMore(true);
        setError("");
        try {
            const r = await getTimeline(repositoryId, {
                category: cat ?? undefined,
                modulePath: mod || undefined,
                search: search || undefined,
                limit: PAGE_SIZE,
                offset: off,
            });
            setTotal(r.total);
            setOffset(off + r.entries.length);
            if (reset) {
                setEntries(r.entries);
                // Store unfiltered for stats
                if (!mod && !cat && !search && off === 0) {
                    setAllEntries(r.entries);
                } else {
                    setAllEntries((prev) => prev.length ? prev : r.entries);
                }
            } else {
                setEntries((prev) => [...prev, ...r.entries]);
            }
        } catch {
            setError("Não foi possível carregar o histórico de commits.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    const applyFilter = useCallback((cat: string | null, mod?: string) => {
        const m = mod !== undefined ? mod : moduleFilter;
        setActiveCategory(cat);
        setDisplayPage(0);
        fetchPage(cat, m, 0, true, searchText || undefined);
    }, [moduleFilter, searchText, repositoryId]);

    function onModuleSearch() {
        setModuleFilter(pendingModule);
        setDisplayPage(0);
        fetchPage(activeCategory, pendingModule, 0, true, searchText || undefined);
    }

    function onTextSearch() {
        setSearchText(pendingSearch);
        setDisplayPage(0);
        fetchPage(activeCategory, moduleFilter, 0, true, pendingSearch || undefined);
    }

    function onClickModule(m: string) {
        setWhyModule(m);
        setPendingModule(m);
        setModuleFilter(m);
        fetchPage(activeCategory, m, 0, true, searchText || undefined);
        moduleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function clearFilters() {
        setPendingModule(""); setModuleFilter(""); setActiveCategory(null);
        setAuthorFilter(null); setSearchText(""); setPendingSearch("");
        setDisplayPage(0);
        fetchPage(null, "", 0, true);
    }

    async function refreshAll() {
        setRefreshing(true);
        setError("");
        try {
            await clearHistoryCache(repositoryId);
            setAllEntries([]);
            setActiveCategory(null); setModuleFilter(""); setPendingModule("");
            setSearchText(""); setPendingSearch(""); setAuthorFilter(null);
            setAiResult(null); setAiQuery(""); setPendingAiQuery("");
            await fetchPage(null, "", 0, true);
        } catch {
            setError("Falha ao recarregar histórico. Verifique a conexão com o backend.");
        } finally {
            setRefreshing(false);
        }
    }

    async function runAiSearch() {
        const q = pendingAiQuery.trim();
        if (!q) return;
        setAiQuery(q);
        setAiResult(null); setAiError(""); setAiLoading(true);
        try {
            // Use explain_why with the query as both the module filter and the question
            const result = await getWhyExplanation(
                repositoryId,
                q,
                `Encontre e explique os commits mais relevantes relacionados com: ${q}`,
            );
            setAiResult(result);
        } catch {
            setAiError("Falha na busca IA. Verifique se o repositório possui commits com esse tópico.");
        } finally {
            setAiLoading(false);
        }
    }

    // ── Derived / computed ────────────────────────────────────────────────────

    const statsSource = allEntries.length > 0 ? allEntries : entries;

    // server-side search covers text/module/category; only author is still client-side
    const filteredEntries = useMemo(() => {
        if (!authorFilter) return entries;
        return entries.filter((e) => e.author === authorFilter);
    }, [entries, authorFilter]);

    // Client-side pagination slice
    const totalPages = Math.max(1, Math.ceil(filteredEntries.length / DISPLAY_PAGE_SIZE));
    const safePage = Math.min(displayPage, totalPages - 1);
    const pagedEntries = useMemo(
        () => filteredEntries.slice(safePage * DISPLAY_PAGE_SIZE, (safePage + 1) * DISPLAY_PAGE_SIZE),
        [filteredEntries, safePage],
    );

    // Group by month (only the current page slice)
    const groupedEntries = useMemo(() => {
        const groups: { key: string; label: string; items: TimelineEntry[] }[] = [];
        let cur: { key: string; label: string; items: TimelineEntry[] } | null = null;
        for (const e of pagedEntries) {
            const k = monthKey(e.timestamp);
            if (!cur || cur.key !== k) {
                cur = { key: k, label: monthLabel(k), items: [] };
                groups.push(cur);
            }
            cur.items.push(e);
        }
        return groups;
    }, [pagedEntries]);

    // Unique authors
    const authors = useMemo(() => {
        const s = new Set(statsSource.map((e) => e.author).filter(Boolean));
        return Array.from(s).sort();
    }, [statsSource]);

    // Stats
    const stats = useMemo(() => {
        if (!statsSource.length) return null;
        const sorted = [...statsSource].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const oldest = sorted[0];
        const newest = sorted[sorted.length - 1];
        const counts: Record<string, number> = {};
        for (const e of statsSource) counts[e.category] = (counts[e.category] ?? 0) + 1;
        const topCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        const modCounts: Record<string, number> = {};
        for (const e of statsSource) for (const m of e.touched_modules) modCounts[m] = (modCounts[m] ?? 0) + 1;
        const topMod = Object.entries(modCounts).sort((a, b) => b[1] - a[1])[0];
        return { oldest, newest, topCat, topMod };
    }, [statsSource]);

    const hasFilter = !!activeCategory || !!moduleFilter || !!searchText || !!authorFilter;

    // ── Guards ────────────────────────────────────────────────────────────────

    if (status !== "completed") {
        return (
            <Card>
                <EmptyState icon="clock-rotate-left" title="Indexe um repositório primeiro"
                    description="Após indexar, o histórico de commits estará disponível aqui." />
            </Card>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {error && <ErrorBanner message={error} onClose={() => setError("")} />}

            {/* AI Analysis panel */}
            <WhyPanel repositoryId={repositoryId} initialModule={whyModule} />

            {/* AI Semantic Search panel */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-2xl border border-violet-200 dark:border-violet-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-200 dark:shadow-violet-900/40">
                        <Icon name="wand-magic-sparkles" className="text-white text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Busca Semântica com IA</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Descreva em linguagem natural o que procura — a IA encontra commits relevantes
                        </p>
                    </div>
                    <button
                        onClick={refreshAll}
                        disabled={refreshing}
                        title="Recarregar todo o histórico (remove limite de 24 meses)"
                        className={`${btnSecondary} text-xs shrink-0`}
                    >
                        {refreshing
                            ? <><Icon name="spinner" className="animate-spin" /> Recarregando…</>
                            : <><Icon name="arrows-rotate" /> Recarregar tudo</>}
                    </button>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Icon name="sparkles" className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 text-xs pointer-events-none" />
                        <input
                            value={pendingAiQuery}
                            onChange={(e) => setPendingAiQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") runAiSearch(); }}
                            placeholder="Ex: refatoração do sistema de autenticação, correções de performance, migrações de banco…"
                            className="w-full text-sm rounded-xl border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-400"
                        />
                    </div>
                    <button
                        onClick={runAiSearch}
                        disabled={aiLoading || !pendingAiQuery.trim()}
                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
                    >
                        {aiLoading
                            ? <><Icon name="spinner" className="animate-spin" /> Buscando…</>
                            : <><Icon name="magnifying-glass" /> Buscar</>}
                    </button>
                </div>

                {aiError && (
                    <p className="mt-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <Icon name="circle-exclamation" /> {aiError}
                    </p>
                )}

                {aiLoading && (
                    <div className="mt-4 flex justify-center py-3">
                        <ThinkingDots label="A IA está analisando o histórico de commits…" />
                    </div>
                )}

                <AnimatePresence>
                    {aiResult && !aiLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/70 dark:bg-gray-900/70 p-4 space-y-3"
                        >
                            <div className="flex items-start gap-2">
                                <Icon name="lightbulb" className="text-violet-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{aiResult.explanation}</p>
                            </div>
                            {aiResult.supporting_commits.length > 0 && (
                                <>
                                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                                        <Icon name="code-commit" />
                                        {aiResult.supporting_commits.length} commits relevantes encontrados — destacados na timeline abaixo
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {aiResult.supporting_commits.map((c) => {
                                            const cc = catConf(c.category);
                                            return (
                                                <span key={c.commit_id} className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full border ${cc.badgeBg} ${cc.border} ${cc.text}`}>
                                                    <Icon name={cc.icon} className="text-[9px]" />
                                                    {shortHash(c.commit_id)}
                                                    <span className="opacity-70 font-sans non-mono truncate max-w-[12rem]">{c.summary}</span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setAiResult(null)}
                                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <Icon name="xmark" className="mr-1" />Limpar resultado
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Stats summary */}
            {!loading && stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                        icon="code-commit"
                        label="Total de commits"
                        value={String(total)}
                        sub={`${filteredEntries.length} visíveis`}
                        color="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                    />
                    <StatCard
                        icon={catConf(stats.topCat?.[0] ?? "other").icon}
                        label="Categoria top"
                        value={catConf(stats.topCat?.[0] ?? "other").label}
                        sub={`${stats.topCat?.[1] ?? 0} commits`}
                        color="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                    />
                    <StatCard
                        icon="calendar-range"
                        label="Período"
                        value={formatDate(stats.newest.timestamp)}
                        sub={`desde ${formatDate(stats.oldest.timestamp)}`}
                        color="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    />
                    <StatCard
                        icon="folder-open"
                        label="Módulo mais ativo"
                        value={stats.topMod ? stats.topMod[0].split("/").pop() ?? stats.topMod[0] : "—"}
                        sub={stats.topMod ? `${stats.topMod[1]} alterações` : undefined}
                        color="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    />
                </div>
            )}

            <div className="flex gap-4 items-stretch">
                {/* ── Sidebar: filters + distribution ──────────────────────── */}
                <div className="w-56 shrink-0 hidden lg:flex lg:flex-col gap-3">
                    {/* Filters card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                                <Icon name="filter" className="text-gray-400" /> Filtros
                            </p>
                            {hasFilter && (
                                <button onClick={clearFilters} className="text-[10px] text-indigo-500 hover:underline font-medium">
                                    Limpar
                                </button>
                            )}
                        </div>

                        {/* Module search */}
                        <div className="mb-3">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Módulo</label>
                            <div className="flex gap-1">
                                <div className="relative flex-1">
                                    <Icon name="code-branch" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none" />
                                    <input
                                        ref={moduleInputRef}
                                        value={pendingModule}
                                        onChange={(e) => setPendingModule(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && onModuleSearch()}
                                        placeholder="ex: auth_service"
                                        className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    />
                                </div>
                                <button onClick={onModuleSearch} className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0">
                                    <Icon name="magnifying-glass" />
                                </button>
                            </div>
                            {moduleFilter && (
                                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded px-2 py-1 border border-indigo-200 dark:border-indigo-800">
                                    <Icon name="filter" className="text-[9px]" />
                                    <span className="truncate flex-1 font-mono">{moduleFilter}</span>
                                    <button onClick={() => { setPendingModule(""); setModuleFilter(""); fetchPage(activeCategory, "", 0, true); }}>
                                        <Icon name="xmark" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Text search */}
                        <div className="mb-3">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Buscar mensagem</label>
                            <div className="flex gap-1">
                                <div className="relative flex-1">
                                    <Icon name="magnifying-glass" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none" />
                                    <input
                                        value={pendingSearch}
                                        onChange={(e) => setPendingSearch(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") onTextSearch(); }}
                                        placeholder="ex: fix login"
                                        className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    />
                                </div>
                                <button onClick={onTextSearch} className="px-2 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs shrink-0">
                                    <Icon name="arrow-right" />
                                </button>
                            </div>
                            {searchText && (
                                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 rounded px-2 py-1 border border-gray-200 dark:border-gray-700">
                                    <Icon name="magnifying-glass" className="text-[9px]" />
                                    <span className="truncate flex-1">{searchText}</span>
                                    <button onClick={() => { setSearchText(""); setPendingSearch(""); fetchPage(activeCategory, moduleFilter, 0, true); }}>
                                        <Icon name="xmark" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Author filter */}
                        {authors.length > 0 && (
                            <div className="mb-3">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Autor</label>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {authors.map((a) => (
                                        <button
                                            key={a}
                                            onClick={() => { setAuthorFilter(authorFilter === a ? null : a); setDisplayPage(0); }}
                                            className={`w-full text-left text-xs flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                                                authorFilter === a
                                                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                            }`}
                                        >
                                            <Icon name="user" className="text-[10px] shrink-0" />
                                            <span className="truncate">{a}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Distribution card */}
                    {!loading && statsSource.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex-1">
                            <CategoryDistribution
                                entries={statsSource}
                                total={total}
                                active={activeCategory}
                                onFilter={(cat) => applyFilter(cat)}
                            />
                        </div>
                    )}
                </div>

                {/* ── Main content ─────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-3">
                    {/* Mobile filters row */}
                    <div className="lg:hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Icon name="code-branch" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                                <input
                                    value={pendingModule}
                                    onChange={(e) => setPendingModule(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && onModuleSearch()}
                                    placeholder="Filtrar por módulo…"
                                    className={`${inputCls} pl-8 text-sm`}
                                />
                            </div>
                            <button onClick={onModuleSearch} className={btnSecondary}><Icon name="magnifying-glass" /></button>
                            {hasFilter && (
                                <button onClick={clearFilters} className={`${btnSecondary} text-xs`}>
                                    <Icon name="filter-circle-xmark" />
                                </button>
                            )}
                        </div>
                        {/* Mobile category pills */}
                        {statsSource.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                                {Object.entries(
                                    statsSource.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + 1; return acc; }, {} as Record<string, number>)
                                ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                                    const c = catConf(cat);
                                    const isActive = activeCategory === cat;
                                    return (
                                        <button key={cat} onClick={() => applyFilter(isActive ? null : cat)}
                                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                                                isActive ? `${c.bg} ${c.border} ${c.text} font-semibold` : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400"
                                            }`}>
                                            <Icon name={c.icon} className="text-[9px]" />
                                            {c.label}
                                            <span className="opacity-70">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Active filter chips */}
                    {hasFilter && (
                        <div className="flex flex-wrap gap-2">
                            {activeCategory && (
                                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${catConf(activeCategory).bg} ${catConf(activeCategory).border} ${catConf(activeCategory).text}`}>
                                    <Icon name={catConf(activeCategory).icon} className="text-[9px]" />
                                    {catConf(activeCategory).label}
                                    <button onClick={() => applyFilter(null)} className="ml-0.5 hover:opacity-70"><Icon name="xmark" className="text-[9px]" /></button>
                                </span>
                            )}
                            {moduleFilter && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                                    <Icon name="code-branch" className="text-[9px]" />
                                    {moduleFilter}
                                    <button onClick={() => { setPendingModule(""); setModuleFilter(""); fetchPage(activeCategory, "", 0, true); }} className="ml-0.5 hover:opacity-70"><Icon name="xmark" className="text-[9px]" /></button>
                                </span>
                            )}
                            {searchText && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                                    <Icon name="magnifying-glass" className="text-[9px]" />
                                    "{searchText}"
                                    <button onClick={() => { setSearchText(""); setPendingSearch(""); }} className="ml-0.5 hover:opacity-70"><Icon name="xmark" className="text-[9px]" /></button>
                                </span>
                            )}
                            {authorFilter && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-medium">
                                    <Icon name="user" className="text-[9px]" />
                                    {authorFilter}
                                    <button onClick={() => setAuthorFilter(null)} className="ml-0.5 hover:opacity-70"><Icon name="xmark" className="text-[9px]" /></button>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-12 flex justify-center">
                            <ThinkingDots label="Carregando histórico de commits…" />
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && filteredEntries.length === 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <EmptyState
                                icon="clock-rotate-left"
                                title="Nenhum commit encontrado"
                                description={hasFilter
                                    ? "Nenhum commit corresponde aos filtros. Tente ampliar a busca."
                                    : "Nenhum commit encontrado nos últimos 24 meses para este repositório."}
                            />
                        </div>
                    )}

                    {/* Timeline grouped by month */}
                    {!loading && groupedEntries.length > 0 && (
                        <>
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                                <div className="relative">
                                    {/* Vertical line */}
                                    <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />

                                    <ul className="space-y-0">
                                        {groupedEntries.map((group) => (
                                            <>
                                                <MonthSeparator key={`sep-${group.key}`} label={group.label} count={group.items.length} />
                                                <motion.div
                                                    key={`grp-${group.key}`}
                                                    variants={{ show: { transition: { staggerChildren: 0.025 } } }}
                                                    initial="hidden"
                                                    animate="show"
                                                    className="space-y-2.5 pb-3"
                                                >
                                                    {group.items.map((entry) => (
                                                        <div
                                                            key={entry.id}
                                                            className={aiHighlightIds.size > 0
                                                                ? aiHighlightIds.has(entry.commit_id)
                                                                    ? "ring-2 ring-violet-400 ring-offset-1 rounded-xl"
                                                                    : "opacity-40 transition-opacity"
                                                                : undefined}
                                                        >
                                                            <CommitCard
                                                                entry={entry}
                                                                onClickModule={onClickModule}
                                                                searchText={searchText}
                                                            />
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            </>
                                        ))}
                                    </ul>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                                <strong className="text-gray-600 dark:text-gray-300">{pagedEntries.length}</strong>
                                                {" "}de{" "}
                                                <strong className="text-gray-600 dark:text-gray-300">{filteredEntries.length}</strong> commits
                                                {filteredEntries.length !== entries.length && (
                                                    <> (filtrado de {entries.length})</>
                                                )}
                                            </p>

                                            <div className="flex items-center gap-1">
                                                {/* First */}
                                                <button
                                                    onClick={() => setDisplayPage(0)}
                                                    disabled={safePage === 0}
                                                    className="px-2 py-1 rounded-lg text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:enabled:bg-gray-50 dark:hover:enabled:bg-gray-700 transition-colors"
                                                    title="Primeira página"
                                                >
                                                    <Icon name="angles-left" />
                                                </button>
                                                {/* Prev */}
                                                <button
                                                    onClick={() => setDisplayPage((p) => Math.max(0, p - 1))}
                                                    disabled={safePage === 0}
                                                    className="px-2 py-1 rounded-lg text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:enabled:bg-gray-50 dark:hover:enabled:bg-gray-700 transition-colors"
                                                >
                                                    <Icon name="chevron-left" />
                                                </button>

                                                {/* Page numbers */}
                                                <div className="flex items-center gap-0.5">
                                                    {Array.from({ length: totalPages }, (_, i) => i)
                                                        .filter((i) => Math.abs(i - safePage) <= 2 || i === 0 || i === totalPages - 1)
                                                        .reduce<(number | "...")[]>((acc, i, idx, arr) => {
                                                            if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                                                            acc.push(i);
                                                            return acc;
                                                        }, [])
                                                        .map((item, idx) =>
                                                            item === "..." ? (
                                                                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                                                            ) : (
                                                                <button
                                                                    key={item}
                                                                    onClick={() => setDisplayPage(item as number)}
                                                                    className={`min-w-[28px] px-2 py-1 rounded-lg text-xs border transition-colors ${
                                                                        safePage === item
                                                                            ? "bg-indigo-600 border-indigo-600 text-white font-semibold"
                                                                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                    }`}
                                                                >
                                                                    {(item as number) + 1}
                                                                </button>
                                                            )
                                                        )}
                                                </div>

                                                {/* Next */}
                                                <button
                                                    onClick={() => setDisplayPage((p) => Math.min(totalPages - 1, p + 1))}
                                                    disabled={safePage === totalPages - 1}
                                                    className="px-2 py-1 rounded-lg text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:enabled:bg-gray-50 dark:hover:enabled:bg-gray-700 transition-colors"
                                                >
                                                    <Icon name="chevron-right" />
                                                </button>
                                                {/* Last */}
                                                <button
                                                    onClick={() => setDisplayPage(totalPages - 1)}
                                                    disabled={safePage === totalPages - 1}
                                                    className="px-2 py-1 rounded-lg text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:enabled:bg-gray-50 dark:hover:enabled:bg-gray-700 transition-colors"
                                                    title="Última página"
                                                >
                                                    <Icon name="angles-right" />
                                                </button>
                                            </div>

                                            <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                                Página <strong className="text-gray-600 dark:text-gray-300">{safePage + 1}</strong> de <strong className="text-gray-600 dark:text-gray-300">{totalPages}</strong>
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {totalPages <= 1 && filteredEntries.length > 0 && (
                                    <p className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-center text-gray-400 dark:text-gray-500">
                                        <strong className="text-gray-600 dark:text-gray-300">{filteredEntries.length}</strong> commits
                                        {filteredEntries.length !== entries.length && <> (filtrado de {entries.length})</>}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
