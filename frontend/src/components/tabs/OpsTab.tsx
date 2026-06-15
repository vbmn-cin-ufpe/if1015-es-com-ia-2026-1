import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getReadiness,
    getOperationalSummary,
    type DependencyStatus,
    type ReadinessResponse,
    type OperationalSummary,
} from "../../services/opsApi";
import {
    Card,
    ThinkingDots,
    ErrorBanner,
    btnSecondary,
    Icon,
} from "../ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

type StatusLevel = "ok" | "warn" | "error" | "unknown";

function classifyStatus(s: string): StatusLevel {
    const lower = s.toLowerCase();
    if (["ok", "healthy", "ready", "operational"].includes(lower)) return "ok";
    if (["warning", "warn", "degraded"].includes(lower)) return "warn";
    if (["error", "fail", "down", "critical"].includes(lower)) return "error";
    return "unknown";
}

const STATUS_STYLES: Record<StatusLevel, { dot: string; text: string; bg: string; border: string; badge: string }> = {
    ok:      { dot: "bg-emerald-500",  text: "text-emerald-600 dark:text-emerald-400",  bg: "bg-emerald-50 dark:bg-emerald-950/40",   border: "border-emerald-200 dark:border-emerald-800",  badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    warn:    { dot: "bg-amber-400",    text: "text-amber-600 dark:text-amber-400",      bg: "bg-amber-50 dark:bg-amber-950/40",       border: "border-amber-200 dark:border-amber-800",      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    error:   { dot: "bg-red-500",      text: "text-red-600 dark:text-red-400",          bg: "bg-red-50 dark:bg-red-950/40",           border: "border-red-200 dark:border-red-800",          badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    unknown: { dot: "bg-gray-400",     text: "text-gray-500 dark:text-gray-400",        bg: "bg-gray-50 dark:bg-gray-800/60",         border: "border-gray-200 dark:border-gray-700",        badge: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
};

const STATUS_ICONS: Record<StatusLevel, string> = {
    ok: "circle-check", warn: "triangle-exclamation", error: "circle-xmark", unknown: "circle-question",
};

const STATUS_LABELS: Record<string, string> = {
    ok: "OK", healthy: "Saudável", ready: "Pronto", operational: "Operacional",
    warning: "Atenção", degraded: "Degradado", error: "Erro", fail: "Falha", down: "Fora do ar",
};

function statusLabel(s: string) { return STATUS_LABELS[s.toLowerCase()] ?? s.toUpperCase(); }

function fmtLatency(ms: number | null) {
    if (ms === null) return "—";
    if (ms < 1) return `${(ms * 1000).toFixed(1)} µs`;
    if (ms < 1000) return `${ms.toFixed(1)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
}

// avg_latency from ops API is in seconds
function fmtLatencySec(sec: number) {
    if (sec === 0) return "—";
    if (sec < 0.001) return `${(sec * 1000000).toFixed(0)} µs`;
    if (sec < 1) return `${(sec * 1000).toFixed(1)} ms`;
    return `${sec.toFixed(2)} s`;
}

function latencyColor(sec: number) {
    if (sec === 0) return "text-gray-400 dark:text-gray-500";
    if (sec < 0.3) return "text-emerald-600 dark:text-emerald-400";
    if (sec < 2) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
}

function parseEndpointKey(key: string) {
    const [method, ...rest] = key.split(":");
    const path = rest.join(":");
    // Shorten path: replace UUIDs with :id
    const short = path.replace(/\/[0-9a-f-]{36}\//g, "/:id/").replace(/\/[0-9a-f-]{36}$/, "/:id");
    return { method, path: short, full: path };
}

const METHOD_COLORS: Record<string, string> = {
    GET:    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    POST:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    PUT:    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    PATCH:  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    OPTIONS:"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

// ── Dep icons ─────────────────────────────────────────────────────────────────

const DEP_ICONS: Record<string, string> = {
    postgres:     "database",
    chromadb:     "layer-group",
    chroma:       "layer-group",
    llm_provider: "microchip",
    redis:        "server",
    default:      "circle-nodes",
};

function depIcon(name: string) {
    return DEP_ICONS[name.toLowerCase()] ?? DEP_ICONS.default;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PulsingDot({ level }: { level: StatusLevel }) {
    const color = { ok: "bg-emerald-500", warn: "bg-amber-400", error: "bg-red-500", unknown: "bg-gray-400" }[level];
    return (
        <span className="relative inline-flex h-3 w-3">
            {level === "ok" && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-50`} />
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
        </span>
    );
}

function OverallBanner({ status, uptime }: { status: string; uptime: string }) {
    const level = classifyStatus(status);
    const s = STATUS_STYLES[level];
    return (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${s.bg} ${s.border}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${s.bg} border ${s.border}`}>
                <Icon name={STATUS_ICONS[level]} className={`${s.text} text-lg`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-base font-bold ${s.text}`}>{statusLabel(status)}</span>
                    <PulsingDot level={level} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">Sistema de IA</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <Icon name="clock" className="text-[10px]" />
                    Uptime: <strong className="text-gray-700 dark:text-gray-300">{uptime}</strong>
                </p>
            </div>
        </div>
    );
}

function DependencyCard({ dep }: { dep: DependencyStatus }) {
    const level = classifyStatus(dep.status);
    const s = STATUS_STYLES[level];
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 flex items-center gap-3 transition-shadow hover:shadow-md ${s.bg} ${s.border}`}
        >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/20 border ${s.border}`}>
                <Icon name={depIcon(dep.name)} className={`${s.text} text-sm`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${s.text}`}>{dep.name}</p>
                    <PulsingDot level={level} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {dep.message || statusLabel(dep.status)}
                </p>
            </div>
            <div className="shrink-0 text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${s.badge} ${s.border}`}>
                    {statusLabel(dep.status)}
                </span>
                {dep.latency_ms !== null && (
                    <p className={`text-xs font-mono mt-1 ${dep.latency_ms < 100 ? "text-emerald-600 dark:text-emerald-400" : dep.latency_ms < 500 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                        {fmtLatency(dep.latency_ms)}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

function EndpointRow({ opKey, op, max }: {
    opKey: string;
    op: { request_count: number; error_count: number; avg_latency: number };
    max: number;
}) {
    const { method, path } = parseEndpointKey(opKey);
    const pct = max > 0 ? Math.min((op.request_count / max) * 100, 100) : 0;
    const errorRate = op.request_count > 0 ? op.error_count / op.request_count : 0;
    const hasErrors = op.error_count > 0;
    const methColor = METHOD_COLORS[method] ?? METHOD_COLORS.OPTIONS;
    // Skip OPTIONS (preflight noise)
    if (method === "OPTIONS") return null;

    return (
        <div className="group py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${methColor}`}>
                    {method}
                </span>
                <span className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 truncate min-w-0">
                    {path}
                </span>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                    {hasErrors && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <Icon name="triangle-exclamation" className="text-[10px]" />
                            {op.error_count} erro{op.error_count > 1 ? "s" : ""}
                        </span>
                    )}
                    <span className={`font-mono font-semibold ${latencyColor(op.avg_latency)}`}>
                        {fmtLatencySec(op.avg_latency)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 font-mono">
                        {op.request_count} req
                    </span>
                </div>
            </div>
            {/* Bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${hasErrors ? "bg-red-400" : "bg-indigo-400"}`}
                    />
                </div>
                {errorRate > 0 && (
                    <span className="text-[10px] text-red-500 font-mono shrink-0">
                        {(errorRate * 100).toFixed(0)}% err
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type SortKey = "requests" | "latency" | "errors";

export function OpsTab() {
    const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
    const [summary, setSummary] = useState<OperationalSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("requests");
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [countdown, setCountdown] = useState(30);

    const load = useCallback(async () => {
        setError("");
        setLoading(true);
        try {
            const [r, s] = await Promise.all([getReadiness(), getOperationalSummary()]);
            setReadiness(r);
            setSummary(s);
            setLastUpdated(new Date());
            setCountdown(30);
        } catch {
            setError("Não foi possível carregar as informações operacionais.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh countdown
    useEffect(() => {
        if (!autoRefresh) return;
        const tick = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) { load(); return 30; }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
    }, [autoRefresh, load]);

    // Sorted operations (exclude OPTIONS)
    const sortedOps = summary
        ? Object.entries(summary.operations)
            .filter(([k]) => !k.startsWith("OPTIONS:"))
            .sort((a, b) => {
                if (sortKey === "requests") return b[1].request_count - a[1].request_count;
                if (sortKey === "latency") return b[1].avg_latency - a[1].avg_latency;
                return b[1].error_count - a[1].error_count;
            })
        : [];

    const maxReqs = sortedOps.length > 0 ? Math.max(...sortedOps.map(([, o]) => o.request_count), 1) : 1;
    const totalErrors = summary ? Object.values(summary.operations).reduce((s, o) => s + o.error_count, 0) : 0;
    const totalReqs = summary ? Object.values(summary.operations).reduce((s, o) => s + o.request_count, 0) : 0;
    const allDepsOk = readiness?.dependencies.every((d) => classifyStatus(d.status) === "ok") ?? false;

    if (loading && !readiness) {
        return (
            <Card>
                <div className="py-10 flex justify-center">
                    <ThinkingDots label="Verificando dependências…" />
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {error && <ErrorBanner message={error} onClose={() => setError("")} />}

            {/* ── Header row ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Icon name="tower-broadcast" className="text-indigo-500" />
                        Painel Operacional
                    </h1>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                            <Icon name="clock" className="text-[10px]" />
                            Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Auto-refresh toggle */}
                    <button
                        onClick={() => setAutoRefresh((v) => !v)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            autoRefresh
                                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300"
                        }`}
                    >
                        <Icon name={autoRefresh ? "stop" : "play"} className="text-[10px]" />
                        {autoRefresh ? `Auto (${countdown}s)` : "Auto-refresh"}
                    </button>
                    <button
                        onClick={load}
                        disabled={loading}
                        className={`${btnSecondary} text-xs`}
                    >
                        <Icon name={loading ? "spinner" : "rotate"} className={loading ? "animate-spin" : ""} />
                        {loading ? "…" : "Atualizar"}
                    </button>
                </div>
            </div>

            {/* ── Overall status banner ── */}
            {summary && <OverallBanner status={summary.status} uptime={summary.uptime_info} />}

            {/* ── KPI row ── */}
            {summary && (
                <motion.div
                    variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                    initial="hidden" animate="show"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                    {[
                        {
                            icon: "arrow-right-arrow-left", label: "Requisições", value: totalReqs,
                            color: "text-indigo-600 dark:text-indigo-400",
                            bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-100 dark:border-indigo-900",
                        },
                        {
                            icon: "triangle-exclamation", label: "Erros totais", value: totalErrors,
                            color: totalErrors > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
                            bg: totalErrors > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-emerald-50 dark:bg-emerald-950/40",
                            border: totalErrors > 0 ? "border-red-100 dark:border-red-900" : "border-emerald-100 dark:border-emerald-900",
                        },
                        {
                            icon: "chart-simple", label: "Pontos de métrica", value: summary.total_metric_points,
                            color: "text-sky-600 dark:text-sky-400",
                            bg: "bg-sky-50 dark:bg-sky-950/40", border: "border-sky-100 dark:border-sky-900",
                        },
                        {
                            icon: "circle-nodes", label: "Dependências OK", value: `${readiness?.dependencies.filter((d) => classifyStatus(d.status) === "ok").length ?? 0}/${readiness?.dependencies.length ?? 0}`,
                            color: allDepsOk ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
                            bg: allDepsOk ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-amber-50 dark:bg-amber-950/40",
                            border: allDepsOk ? "border-emerald-100 dark:border-emerald-900" : "border-amber-100 dark:border-amber-900",
                        },
                    ].map(({ icon, label, value, color, bg, border }) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-xl border p-4 ${bg} ${border}`}
                        >
                            <div className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Icon name={icon} className={`${color} text-xs`} />
                                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* ── Dependencies ── */}
            {readiness && (
                <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Icon name="circle-nodes" className="text-gray-400 dark:text-gray-500" />
                        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Dependências ({readiness.dependencies.length})
                        </h2>
                    </div>
                    <motion.div
                        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                        initial="hidden" animate="show"
                        className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    >
                        {readiness.dependencies.map((dep) => (
                            <DependencyCard key={dep.name} dep={dep} />
                        ))}
                    </motion.div>
                </div>
            )}

            {/* ── Endpoint table ── */}
            {sortedOps.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                <Icon name="route" className="text-indigo-500 text-sm" />
                            </div>
                            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                Endpoints <span className="text-gray-400 font-normal">({sortedOps.length})</span>
                            </h2>
                        </div>
                        {/* Sort controls */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700">
                            {(["requests", "latency", "errors"] as SortKey[]).map((k) => (
                                <button
                                    key={k}
                                    onClick={() => setSortKey(k)}
                                    className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                                        sortKey === k
                                            ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm font-semibold"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                                >
                                    {k === "requests" ? "Requisições" : k === "latency" ? "Latência" : "Erros"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {sortedOps.map(([key, op]) => (
                            <EndpointRow key={key} opKey={key} op={op} max={maxReqs} />
                        ))}
                    </div>
                </Card>
            )}

            {/* ── Recent errors ── */}
            <AnimatePresence>
                {summary && summary.recent_errors.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                                    <Icon name="bug" className="text-red-500 text-sm" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    Erros recentes
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                        {summary.recent_errors.length}
                                    </span>
                                </h2>
                            </div>
                            <ul className="space-y-2">
                                {summary.recent_errors.map((e, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg px-3 py-2.5"
                                    >
                                        <Icon name="circle-xmark" className="text-red-400 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{e.name}</p>
                                            {Object.keys(e.dimensions).length > 0 && (
                                                <p className="text-xs text-red-600 dark:text-red-400 font-mono mt-0.5 truncate">
                                                    {Object.entries(e.dimensions).map(([k, v]) => `${k}=${v}`).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-xs text-red-400 dark:text-red-500 font-mono">
                                                {new Date(e.timestamp).toLocaleTimeString("pt-BR")}
                                            </span>
                                            <p className="text-[10px] text-red-300 dark:text-red-600">
                                                {new Date(e.timestamp).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── No errors happy state ── */}
            {summary && summary.recent_errors.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm text-emerald-700 dark:text-emerald-300">
                    <Icon name="shield-halved" className="text-emerald-500 text-base shrink-0" />
                    <span>Nenhum erro registrado — sistema operando normalmente.</span>
                </div>
            )}
        </div>
    );
}
