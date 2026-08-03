import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    fadeUp, fadeUpTransition,
    staggerContainer,
    scaleIn, scaleInTransition,
} from "../../animations";
import { useAuthStore } from "../../store/authStore";
import {
    indexRepository,
    getRepositoryStatus,
    type RepoStatusResponse,
} from "../../services/repoApi";
import {
    Badge,
    ProgressBar,
    ThinkingDots,
    btnPrimary,
    btnSecondary,
    inputCls,
    Icon,
} from "../ui";
import { useI18n } from "../../i18n";

// â”€â”€ constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_PROGRESS: Record<string, number> = {
    queued: 5,
    cloning: 20,
    detecting: 35,
    chunking: 55,
    embedding: 80,
    storing: 92,
    completed: 100,
    failed: 0,
};

// STATUS_LABEL removed — use t() inside component instead

/** Lang name â†’ [tailwind bg, tailwind text] */
const LANG_STYLE: Record<string, [string, string]> = {
    python:     ["bg-blue-100 dark:bg-blue-900/40",    "text-blue-700 dark:text-blue-300"],
    javascript: ["bg-yellow-100 dark:bg-yellow-900/40","text-yellow-700 dark:text-yellow-300"],
    typescript: ["bg-cyan-100 dark:bg-cyan-900/40",    "text-cyan-700 dark:text-cyan-300"],
    java:       ["bg-orange-100 dark:bg-orange-900/40","text-orange-700 dark:text-orange-300"],
    go:         ["bg-sky-100 dark:bg-sky-900/40",      "text-sky-700 dark:text-sky-300"],
    rust:       ["bg-red-100 dark:bg-red-900/40",      "text-red-700 dark:text-red-300"],
    kotlin:     ["bg-violet-100 dark:bg-violet-900/40","text-violet-700 dark:text-violet-300"],
    swift:      ["bg-pink-100 dark:bg-pink-900/40",    "text-pink-700 dark:text-pink-300"],
    csharp:     ["bg-green-100 dark:bg-green-900/40",  "text-green-700 dark:text-green-300"],
    cpp:        ["bg-indigo-100 dark:bg-indigo-900/40","text-indigo-700 dark:text-indigo-300"],
    c:          ["bg-indigo-100 dark:bg-indigo-900/40","text-indigo-700 dark:text-indigo-300"],
    ruby:       ["bg-rose-100 dark:bg-rose-900/40",    "text-rose-700 dark:text-rose-300"],
    php:        ["bg-violet-100 dark:bg-violet-900/40","text-violet-700 dark:text-violet-300"],
};

// FEATURE_CARDS moved inside component to support i18n

const COLOR_MAP: Record<string, string> = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400",
    violet: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 hover:border-violet-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-400",
    rose: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 hover:border-rose-400",
};
const ICON_COLOR_MAP: Record<string, string> = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50",
};
const LABEL_COLOR_MAP: Record<string, string> = {
    indigo: "text-indigo-800 dark:text-indigo-200",
    emerald: "text-emerald-800 dark:text-emerald-200",
    violet: "text-violet-800 dark:text-violet-200",
    amber: "text-amber-800 dark:text-amber-200",
    rose: "text-rose-800 dark:text-rose-200",
};

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatDate(iso?: string | null, locale = "en-US"): string {
    if (!iso) return "—";
    try {
        return new Intl.DateTimeFormat(locale, {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function formatSize(kb?: number | null): string {
    if (kb == null) return "—";
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function extractRepoName(url?: string | null): string {
    if (!url) return "";
    const parts = url.replace(/\.git$/, "").split("/");
    if (parts.length >= 2) return parts.slice(-2).join("/");
    return parts[parts.length - 1] ?? "";
}

// â”€â”€ StatCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatCard({ icon, iconColor, label, value }: {
    icon: string; iconColor: string; label: string; value: string;
}) {
    return (
        <motion.div
            variants={fadeUp}
            transition={fadeUpTransition}
            whileHover={{ y: -2, boxShadow: "0 4px 16px 0 rgba(99,102,241,0.10)" }}
            className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-100 dark:border-gray-700 cursor-default"
        >
            <div className="flex items-center gap-2 mb-1">
                <Icon name={icon} className={`text-sm ${iconColor}`} />
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </motion.div>
    );
}

interface Props {
    repositoryId: string;
    status: string;
    onIndexed: (id: string, status: string) => void;
}

export function RepoTab({ repositoryId, status, onIndexed }: Props) {
    const navigate = useNavigate();
    const token = useAuthStore((s) => s.token) ?? "";
    const { t, locale } = useI18n();
    const statusLabel: Record<string, string> = {
        queued:    t('repo_statusQueued'),
        cloning:   t('repo_statusCloning'),
        detecting: t('repo_statusDetecting'),
        chunking:  t('repo_statusChunking'),
        embedding: t('repo_statusEmbedding'),
        storing:   t('repo_statusStoring'),
        completed: t('repo_statusCompleted'),
        failed:    t('repo_statusFailed'),
    };
    const featureCards = [
        { route: "/chat",    icon: "comments",          label: t('nav_chat'),    desc: t('repo_featureChat_desc'),    color: "indigo" },
        { route: "/tour",    icon: "route",             label: t('nav_tour'),    desc: t('repo_featureTour_desc'),    color: "emerald" },
        { route: "/graph",   icon: "diagram-project",   label: t('nav_graph'),   desc: t('repo_featureGraph_desc'),   color: "violet" },
        { route: "/history", icon: "clock-rotate-left", label: t('nav_history'), desc: t('repo_featureHistory_desc'), color: "amber" },
        { route: "/metrics", icon: "chart-bar",         label: t('nav_metrics'), desc: t('repo_featureMetrics_desc'), color: "rose" },
    ] as const;
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [stepLabel, setStepLabel] = useState(statusLabel.queued);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [repoData, setRepoData] = useState<RepoStatusResponse | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Clean up polling on unmount
    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    // Load data when already indexed on mount
    useEffect(() => {
        if (repositoryId && status === "completed" && !repoData) {
            getRepositoryStatus(repositoryId, token).then((r) => {
                setRepoData(r);
                if (r.error_message) setErrorMsg(r.error_message);
            }).catch(() => {});
        }
    }, [repositoryId]);

    function startPolling(repoId: string) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const r = await getRepositoryStatus(repoId, token);
                const pct = STATUS_PROGRESS[r.index_status] ?? 50;
                setProgress(pct);
                setStepLabel(statusLabel[r.index_status] ?? t('repo_processing'));
                onIndexed(repoId, r.index_status);

                if (r.index_status === "completed" || r.index_status === "failed") {
                    clearInterval(pollRef.current!);
                    pollRef.current = null;
                    setLoading(false);
                    setRepoData(r);
                    if (r.error_message) setErrorMsg(r.error_message);
                }
            } catch { /* Ignore transient polling errors */ }
        }, 2000);
    }

    async function onIndex(e: FormEvent) {
        e.preventDefault();
        if (!url.trim()) return;
        setErrorMsg(null);
        setRepoData(null);
        setLoading(true);
        setProgress(STATUS_PROGRESS.queued);
        setStepLabel(statusLabel.queued);
        try {
            const r = await indexRepository(url.trim(), token);
            onIndexed(r.repository_id, r.job_status);
            startPolling(r.repository_id);
        } catch {
            setErrorMsg(t('repo_indexFailHint'));
            setLoading(false);
        }
    }

    async function onRefresh() {
        if (!repositoryId) return;
        try {
            const r = await getRepositoryStatus(repositoryId, token);
            onIndexed(repositoryId, r.index_status);
            setRepoData(r);
            if (r.error_message) setErrorMsg(r.error_message);
        } catch {
            setErrorMsg(t('repo_refreshFailed'));
        }
    }

    const stats = repoData?.stats;
    const langMap = stats?.languages as Record<string, number> | undefined;
    const languages = langMap ? Object.entries(langMap).sort((a, b) => b[1] - a[1]) : [];
    const totalLangFiles = languages.reduce((s, [, c]) => s + c, 0) || 1;
    const repoName = (stats?.repo_name as string | undefined)
        ?? extractRepoName(repoData?.repository_url ?? url);

    return (
        <div className="space-y-5">
            {/* â”€â”€ Index form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                            <Icon name="code-branch" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('repo_indexTitle')}</h2>
                            <p className="text-xs text-gray-400">{t('repo_supported')}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-5">
                    <form onSubmit={onIndex} className="flex gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <Icon name="github" />
                            </span>
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://github.com/owner/repo"
                                disabled={loading}
                                className={`${inputCls} pl-9`}
                            />
                        </div>
                        <button type="submit" disabled={loading || !url.trim()} className={btnPrimary}>
                            {loading ? (
                                <><Icon name="spinner" className="animate-spin" /> {t('repo_indexingBtn')}</>
                            ) : (
                                <><Icon name="code-branch" /> {t('repo_indexBtn')}</>
                            )}
                        </button>
                    </form>

                    {loading && (
                        <div className="mt-4 space-y-2">
                            <ProgressBar value={progress} />
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <ThinkingDots label={stepLabel} />
                                <span>{Math.round(progress)}%</span>
                            </div>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-0.5">
                                <Icon name="triangle-exclamation" /> {t('repo_errorLabel')}
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">{errorMsg}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* â”€â”€ Repo hero card (when we have a repositoryId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {repositoryId && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/60 to-transparent dark:from-indigo-900/20 dark:to-transparent">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 shadow-sm text-indigo-600 dark:text-indigo-400">
                                <Icon name="book-open" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {repoName || repositoryId.slice(0, 16) + "…"}
                                </h3>
                                {(repoData?.repository_url || url) && (
                                    <a
                                        href={repoData?.repository_url || url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                                    >
                                        <Icon name="arrow-up-right-from-square" className="mr-1 text-[10px]" />
                                        {repoData?.repository_url || url}
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Badge status={status || "pending"} />
                            <button onClick={onRefresh} className={`${btnSecondary} text-xs`}>
                                <Icon name="rotate" /> {t('repo_refresh')}
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-5 space-y-5">
                        {/* Stats grid */}
                        {stats && (
                            <motion.div
                                variants={staggerContainer}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                            >
                                <StatCard
                                    icon="file-code"
                                    iconColor="text-indigo-500"
                                    label={t('repo_statFiles')}
                                    value={stats.source_files != null ? String(stats.source_files) : "—"}
                                />
                                <StatCard
                                    icon="puzzle-piece"
                                    iconColor="text-violet-500"
                                    label={t('repo_statChunks')}
                                    value={stats.chunks != null ? String(stats.chunks) : "—"}
                                />
                                <StatCard
                                    icon="database"
                                    iconColor="text-emerald-500"
                                    label={t('repo_statVectors')}
                                    value={stats.vectors != null ? String(stats.vectors) : "—"}
                                />
                                <StatCard
                                    icon="weight-hanging"
                                    iconColor="text-amber-500"
                                    label={t('repo_statSize')}
                                    value={formatSize(stats.total_size_kb as number | undefined)}
                                />
                            </motion.div>
                        )}

                        {/* Dates row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2.5">
                                <Icon name="calendar-plus" className="text-indigo-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('repo_indexedAt')}</p>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {formatDate(repoData?.created_at, locale)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2.5">
                                <Icon name="calendar-check" className="text-emerald-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('repo_updatedAt')}</p>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {formatDate(repoData?.updated_at, locale)}
                                    </p>
                                </div>
                            </div>
                            {stats?.elapsed_seconds != null && (
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2.5">
                                    <Icon name="stopwatch" className="text-violet-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('repo_indexingTime')}</p>
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {stats.elapsed_seconds as number}s
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ID row */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 shrink-0">ID:</span>
                            <code className="font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 truncate">
                                {repositoryId}
                            </code>
                        </div>

                        {/* Languages */}
                        {languages.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <Icon name="code" className="text-indigo-400" /> {t('repo_languages')}
                                </p>
                                {/* Bar chart */}
                                <div className="flex rounded-lg overflow-hidden h-3 mb-3 bg-gray-100 dark:bg-gray-700">
                                    {languages.map(([lang, count], i) => {
                                        const pct = (count / totalLangFiles) * 100;
                                        const [bg] = LANG_STYLE[lang] ?? ["bg-gray-300"];
                                        return (
                                            <motion.div
                                                key={lang}
                                                title={`${lang}: ${count} arquivo${count !== 1 ? "s" : ""} (${pct.toFixed(0)}%)`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                                                className={bg}
                                            />
                                        );
                                    })}
                                </div>
                                <motion.div
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="show"
                                    className="flex flex-wrap gap-2"
                                >
                                    {languages.map(([lang, count]) => {
                                        const [bg, text] = LANG_STYLE[lang] ?? ["bg-gray-100 dark:bg-gray-800", "text-gray-700 dark:text-gray-300"];
                                        const pct = ((count / totalLangFiles) * 100).toFixed(0);
                                        return (
                                            <motion.span
                                                key={lang}
                                                variants={scaleIn}
                                                transition={scaleInTransition}
                                                className={`inline-flex items-center gap-1.5 text-xs font-medium ${bg} ${text} px-2.5 py-1 rounded-full`}
                                            >
                                                <span className="capitalize">{lang}</span>
                                                <span className="opacity-60">{count} · {pct}%</span>
                                            </motion.span>
                                        );
                                    })}
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* â”€â”€ Feature cards (only when completed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {status === "completed" && (
                <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <Icon name="rocket" className="text-indigo-400" />
                        {t('repo_exploreTitle')}
                    </p>
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                    >
                        {featureCards.map((card) => (
                            <motion.button
                                key={card.route}
                                variants={fadeUp}
                                transition={fadeUpTransition}
                                whileHover={{ y: -3, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(card.route)}
                                className={`group text-left flex items-start gap-4 p-4 rounded-xl border transition-colors duration-200 cursor-pointer ${COLOR_MAP[card.color]}`}
                            >
                                <span className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${ICON_COLOR_MAP[card.color]} group-hover:scale-110 transition-transform`}>
                                    <Icon name={card.icon} />
                                </span>
                                <div className="min-w-0">
                                    <p className={`font-semibold text-sm flex items-center gap-1 ${LABEL_COLOR_MAP[card.color]}`}>
                                        {card.label}
                                        <Icon name="arrow-right" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{card.desc}</p>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
