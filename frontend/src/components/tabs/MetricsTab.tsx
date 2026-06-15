import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getMetrics,
    getQualityReport,
    submitFeedback,
    type MetricsPayload,
    type QualityReport,
} from "../../services/metricsApi";
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

interface Props {
    repositoryId: string;
    status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMs(ms: number) {
    if (ms === 0) return "—";
    return ms < 1000 ? `${ms.toFixed(0)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function fmtPct(ratio: number) {
    if (ratio === 0) return "—";
    return `${(ratio * 100).toFixed(1)}%`;
}

function fmtCount(v: number) {
    return v === 0 ? "—" : String(v);
}

function qualityColor(score: number): { text: string; bg: string; border: string; bar: string; ring: string } {
    if (score >= 0.8) return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", bar: "bg-emerald-500", ring: "#10b981" };
    if (score >= 0.6) return { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", bar: "bg-blue-500", ring: "#3b82f6" };
    if (score >= 0.4) return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", bar: "bg-amber-500", ring: "#f59e0b" };
    return { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800", bar: "bg-red-500", ring: "#ef4444" };
}

const QUALITY_LABELS: Record<string, { icon: string; label: string }> = {
    excellent:        { icon: "trophy",         label: "Excelente" },
    good:             { icon: "thumbs-up",      label: "Bom" },
    needs_improvement:{ icon: "triangle-exclamation", label: "Melhorar" },
    poor:             { icon: "circle-xmark",   label: "Fraco" },
};

function qualLabel(key: string) {
    return QUALITY_LABELS[key] ?? { icon: "circle-question", label: key };
}

// ── Gauge ─────────────────────────────────────────────────────────────────────

function QualityGauge({ score, label }: { score: number; label: string }) {
    const radius = 38;
    const circ = 2 * Math.PI * radius;
    const dash = (score / 100) * circ;
    const col = qualityColor(score / 100);
    const ql = qualLabel(label);
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative">
                <svg width="108" height="108" viewBox="0 0 108 108">
                    {/* Track */}
                    <circle cx="54" cy="54" r={radius} fill="none" stroke="currentColor" strokeWidth="9"
                        className="text-gray-100 dark:text-gray-700" />
                    {/* Progress */}
                    <motion.circle
                        cx="54" cy="54" r={radius} fill="none"
                        stroke={col.ring} strokeWidth="9"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        transform="rotate(-90 54 54)"
                        initial={{ strokeDasharray: `0 ${circ}` }}
                        animate={{ strokeDasharray: `${dash} ${circ}` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                    <text x="54" y="58" textAnchor="middle" fontSize="20" fontWeight="800" fill={col.ring}>
                        {score.toFixed(0)}
                    </text>
                </svg>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${col.bg} ${col.border} ${col.text}`}>
                <Icon name={ql.icon} />{ql.label}
            </div>
        </div>
    );
}

// ── Metric KPI card ───────────────────────────────────────────────────────────

interface KpiDef {
    icon: string;
    label: string;
    desc: string;
    format: (v: number) => string;
    color: string;
    trend?: "higher-better" | "lower-better";
}

const KPI_DEFS: Record<keyof MetricsPayload, KpiDef> = {
    total_events: {
        icon: "bolt",
        label: "Eventos",
        desc: "Interações totais no período",
        format: fmtCount,
        color: "text-indigo-600 dark:text-indigo-400",
    },
    total_feedback: {
        icon: "star",
        label: "Feedbacks",
        desc: "Avaliações recebidas dos usuários",
        format: fmtCount,
        color: "text-amber-600 dark:text-amber-400",
    },
    response_latency_p50: {
        icon: "gauge-simple",
        label: "Latência p50",
        desc: "Tempo mediano de resposta do LLM",
        format: fmtMs,
        color: "text-sky-600 dark:text-sky-400",
        trend: "lower-better",
    },
    response_latency_p95: {
        icon: "gauge-high",
        label: "Latência p95",
        desc: "95% das respostas ficam abaixo deste tempo",
        format: fmtMs,
        color: "text-blue-600 dark:text-blue-400",
        trend: "lower-better",
    },
    onboarding_flow_completion_rate: {
        icon: "map-marked-alt",
        label: "Tours concluídos",
        desc: "Taxa de conclusão do tour guiado",
        format: fmtPct,
        color: "text-violet-600 dark:text-violet-400",
        trend: "higher-better",
    },
    answer_usefulness_rate: {
        icon: "thumbs-up",
        label: "Utilidade",
        desc: "Proporção de respostas avaliadas como úteis",
        format: fmtPct,
        color: "text-emerald-600 dark:text-emerald-400",
        trend: "higher-better",
    },
    answer_correctness_rate: {
        icon: "circle-check",
        label: "Precisão",
        desc: "Proporção de respostas avaliadas como corretas",
        format: fmtPct,
        color: "text-green-600 dark:text-green-400",
        trend: "higher-better",
    },
    feedback_coverage_rate: {
        icon: "comments",
        label: "Cobertura",
        desc: "Proporção de respostas que receberam avaliação",
        format: fmtPct,
        color: "text-teal-600 dark:text-teal-400",
        trend: "higher-better",
    },
};

function KpiCard({ metricKey, value }: { metricKey: keyof MetricsPayload; value: number }) {
    const def = KPI_DEFS[metricKey];
    const isEmpty = value === 0;
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700`}>
                <Icon name={def.icon} className={`${def.color} text-sm`} />
            </div>
            <div>
                <p className={`text-2xl font-extrabold tracking-tight ${isEmpty ? "text-gray-300 dark:text-gray-600" : def.color}`}>
                    {def.format(value)}
                </p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{def.label}</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{def.desc}</p>
            {def.trend && !isEmpty && (
                <span className={`absolute top-3 right-3 text-[10px] font-medium flex items-center gap-0.5 ${def.trend === "higher-better" ? "text-emerald-500" : "text-sky-500"}`}>
                    <Icon name={def.trend === "higher-better" ? "arrow-trend-up" : "arrow-trend-down"} className="text-[9px]" />
                    {def.trend === "higher-better" ? "maior melhor" : "menor melhor"}
                </span>
            )}
        </motion.div>
    );
}

// ── Rate bar row ──────────────────────────────────────────────────────────────

function RateBar({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
    const pct = Math.min(value * 100, 100);
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <Icon name={icon} />{label}
                </span>
                <span className={`font-bold ${color}`}>{pct > 0 ? `${pct.toFixed(1)}%` : "—"}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className={`h-full rounded-full ${color.replace("text-", "bg-").split(" ")[0]}`}
                />
            </div>
        </div>
    );
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button"
                    onClick={() => onChange(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className={`text-xl transition-all hover:scale-125 ${n <= (hover || value) ? "text-amber-400" : "text-gray-200 dark:text-gray-600"}`}
                >
                    <i className={`${n <= (hover || value) ? "fa-solid" : "fa-regular"} fa-star`} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MetricsTab({ repositoryId, status }: Props) {
    const [metricsData, setMetricsData] = useState<MetricsPayload | null>(null);
    const [qualityReport, setQuality] = useState<QualityReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Feedback form
    const [responseId, setResponseId] = useState("");
    const [usefulness, setUsefulness] = useState(3);
    const [correctness, setCorrectness] = useState(3);
    const [comment, setComment] = useState("");
    const [fbStatus, setFbStatus] = useState<"idle" | "sending" | "sent">("idle");

    useEffect(() => {
        if (status !== "completed") return;
        load();
    }, [repositoryId, status]);

    async function load() {
        setError("");
        setLoading(true);
        try {
            const [m, q] = await Promise.all([
                getMetrics(repositoryId),
                getQualityReport(repositoryId),
            ]);
            setMetricsData(m.metrics);
            setQuality(q);
            setLastUpdated(new Date());
        } catch {
            setError("Falha ao carregar métricas. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }

    async function onFeedback(e: FormEvent) {
        e.preventDefault();
        if (!responseId.trim()) return;
        setFbStatus("sending");
        try {
            await submitFeedback({
                repository_id: repositoryId,
                response_id: responseId.trim(),
                usefulness_score: usefulness,
                correctness_score: correctness,
                comment: comment || undefined,
            });
            setFbStatus("sent");
            setResponseId(""); setComment(""); setUsefulness(3); setCorrectness(3);
            setTimeout(() => { setFbStatus("idle"); load(); }, 2500);
        } catch {
            setError("Falha ao enviar feedback.");
            setFbStatus("idle");
        }
    }

    if (status !== "completed") {
        return <Card><EmptyState icon="chart-bar" title="Indexe um repositório primeiro" /></Card>;
    }

    if (loading && !metricsData) {
        return <Card><div className="py-10 flex justify-center"><ThinkingDots label="Carregando métricas…" /></div></Card>;
    }

    const score = qualityReport ? qualityReport.overall_quality_score : 0;
    const col = qualityColor(score);
    const m = metricsData;

    return (
        <div className="space-y-4">
            {error && <ErrorBanner message={error} onClose={() => setError("")} />}

            {/* ── Hero: quality score + rate bars ── */}
            {qualityReport && m && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Score card */}
                    <Card className="flex flex-col items-center justify-center gap-3">
                        <QualityGauge score={score * 100} label={qualityReport.quality_label} />
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Score de qualidade geral</p>
                        {lastUpdated && (
                            <p className="text-[10px] text-gray-300 dark:text-gray-600 flex items-center gap-1">
                                <Icon name="clock" className="text-[9px]" />
                                Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        )}
                    </Card>

                    {/* Summary + rate bars */}
                    <Card className="md:col-span-2 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <Icon name="file-lines" className="text-gray-400" />
                                    Resumo do período
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
                                    {qualityReport.summary
                                        .replace("Quality assessment: ", "")
                                        .replace("EXCELLENT", "Excelente ✓")
                                        .replace("GOOD", "Bom ✓")
                                        .replace("NEEDS_IMPROVEMENT", "Precisa melhorar ⚠")
                                        .replace("POOR", "Fraco ✗")}
                                </p>
                            </div>
                            <button onClick={load} disabled={loading} className={`${btnSecondary} text-xs shrink-0`}>
                                <Icon name={loading ? "spinner" : "rotate"} className={loading ? "animate-spin" : ""} />
                                {loading ? "…" : "Atualizar"}
                            </button>
                        </div>

                        {/* Period */}
                        {qualityReport.period_start && qualityReport.period_start !== "1970-01-01T00:00:00" && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                <Icon name="calendar-range" />
                                {new Date(qualityReport.period_start).toLocaleDateString("pt-BR")}
                                <Icon name="arrow-right" className="text-[10px]" />
                                {new Date(qualityReport.period_end).toLocaleDateString("pt-BR")}
                            </div>
                        )}

                        {/* Rate bars */}
                        <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                            <RateBar label="Utilidade das respostas" icon="thumbs-up"
                                value={m.answer_usefulness_rate}
                                color="text-emerald-600 dark:text-emerald-400" />
                            <RateBar label="Precisão das respostas" icon="circle-check"
                                value={m.answer_correctness_rate}
                                color="text-green-600 dark:text-green-400" />
                            <RateBar label="Cobertura de feedback" icon="comments"
                                value={m.feedback_coverage_rate}
                                color="text-teal-600 dark:text-teal-400" />
                            <RateBar label="Conclusão de tours" icon="map-marked-alt"
                                value={m.onboarding_flow_completion_rate}
                                color="text-violet-600 dark:text-violet-400" />
                        </div>
                    </Card>
                </div>
            )}

            {/* ── KPI grid ── */}
            {m && (
                <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Icon name="table-cells" className="text-gray-400 dark:text-gray-500" />
                        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Métricas detalhadas
                        </h2>
                    </div>
                    <motion.div
                        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                    >
                        {(Object.keys(KPI_DEFS) as (keyof MetricsPayload)[]).map((key) => (
                            <KpiCard key={key} metricKey={key} value={m[key]} />
                        ))}
                    </motion.div>
                </div>
            )}

            {/* ── Latency highlight (only when data present) ── */}
            {m && (m.response_latency_p50 > 0 || m.response_latency_p95 > 0) && (
                <Card className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center">
                            <Icon name="stopwatch" className="text-sky-500 text-lg" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Latência LLM</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Tempo de resposta medido</p>
                        </div>
                    </div>
                    <div className="flex gap-6 flex-wrap">
                        {[
                            { label: "Mediana (p50)", value: m.response_latency_p50, color: "text-sky-600 dark:text-sky-400" },
                            { label: "P95 (cauda)", value: m.response_latency_p95, color: "text-blue-600 dark:text-blue-400" },
                        ].map(({ label, value, color }) => (
                            <div key={label}>
                                <p className={`text-xl font-extrabold ${color}`}>{fmtMs(value)}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ── Feedback form ── */}
            <Card>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                        <Icon name="star-half-stroke" className="text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Avaliar uma Resposta</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Ajude a melhorar o sistema avaliando respostas do Chat
                        </p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {fbStatus === "sent" ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-8 text-center space-y-2"
                        >
                            <Icon name="circle-check" className="text-5xl text-emerald-500" />
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Feedback enviado! Obrigado.</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">As métricas serão atualizadas em instantes.</p>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onSubmit={onFeedback}
                            className="space-y-4"
                        >
                            {/* Response ID */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <Icon name="fingerprint" className="mr-1.5 text-gray-400" />
                                    ID da Resposta
                                </label>
                                <input
                                    value={responseId}
                                    onChange={(e) => setResponseId(e.target.value)}
                                    placeholder="Cole aqui o ID da resposta recebida no Chat"
                                    required
                                    className={inputCls}
                                />
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    <Icon name="circle-info" className="mr-1" />
                                    Disponível nos metadados de cada resposta no Chat
                                </p>
                            </div>

                            {/* Stars */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Icon name="thumbs-up" className="mr-1.5 text-amber-500" />
                                        Utilidade
                                    </label>
                                    <StarRating value={usefulness} onChange={setUsefulness} />
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                                        {["", "Inútil", "Pouco útil", "Neutro", "Útil", "Muito útil"][usefulness]}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Icon name="circle-check" className="mr-1.5 text-emerald-500" />
                                        Precisão
                                    </label>
                                    <StarRating value={correctness} onChange={setCorrectness} />
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                                        {["", "Incorreto", "Impreciso", "Razoável", "Correto", "Perfeito"][correctness]}
                                    </p>
                                </div>
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <Icon name="comment-dots" className="mr-1.5 text-gray-400" />
                                    Comentário <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={3}
                                    placeholder="O que poderia ser melhorado? Algo que estava errado?"
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <button type="submit" disabled={fbStatus === "sending" || !responseId.trim()} className={btnPrimary}>
                                    {fbStatus === "sending"
                                        ? <><Icon name="spinner" className="animate-spin" /> Enviando…</>
                                        : <><Icon name="paper-plane" /> Enviar Feedback</>}
                                </button>
                                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <Icon name="shield-halved" className="text-[10px]" />
                                    Seu feedback é anônimo e ajuda a treinar o sistema
                                </p>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>
            </Card>
        </div>
    );
}

