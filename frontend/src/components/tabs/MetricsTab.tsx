import { useState, useEffect, FormEvent } from "react";
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

function fmtMs(ms: number) {
    return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function fmtPct(ratio: number) {
    return `${(ratio * 100).toFixed(1)}%`;
}

/** Circular quality gauge */
function QualityGauge({ score, label }: { score: number; label: string }) {
    const radius = 36;
    const circ = 2 * Math.PI * radius;
    const dash = (score / 100) * circ;
    const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className="flex flex-col items-center justify-center py-4">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dasharray 0.8s ease" }}
                />
                <text
                    x="50"
                    y="56"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="700"
                    fill={color}
                >
                    {score.toFixed(0)}
                </text>
            </svg>
            <p className="text-sm font-semibold mt-1" style={{ color }}>
                {label}
            </p>
        </div>
    );
}

/** Star rating (1-5) */
function StarRating({
    value,
    onChange,
}: {
    value: number;
    onChange: (n: number) => void;
}) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className={`text-xl transition-colors ${n <= value ? "text-amber-400" : "text-gray-200 dark:text-gray-600"}`}
                >
                    <i
                        className={`${n <= value ? "fa-solid" : "fa-regular"} fa-star`}
                        aria-hidden="true"
                    />
                </button>
            ))}
        </div>
    );
}

const METRIC_INFO: Record<
    keyof MetricsPayload,
    { label: string; desc: string; format: (v: number) => string }
> = {
    total_events: {
        label: "Total de eventos",
        desc: "Número de interações registradas no período",
        format: (v) => String(v),
    },
    total_feedback: {
        label: "Feedbacks recebidos",
        desc: "Número de avaliações enviadas pelos usuários",
        format: (v) => String(v),
    },
    response_latency_p50: {
        label: "Latência p50",
        desc: "Mediana do tempo de resposta do LLM",
        format: fmtMs,
    },
    response_latency_p95: {
        label: "Latência p95",
        desc: "95% das respostas ficam abaixo deste tempo",
        format: fmtMs,
    },
    onboarding_flow_completion_rate: {
        label: "Conclusão de tours",
        desc: "Taxa de usuários que completaram o tour guiado",
        format: fmtPct,
    },
    answer_usefulness_rate: {
        label: "Taxa de utilidade",
        desc: "Proporção de respostas avaliadas como úteis",
        format: fmtPct,
    },
    answer_correctness_rate: {
        label: "Taxa de correção",
        desc: "Proporção de respostas avaliadas como corretas",
        format: fmtPct,
    },
    feedback_coverage_rate: {
        label: "Cobertura de feedback",
        desc: "Proporção de respostas que receberam avaliação",
        format: fmtPct,
    },
};

export function MetricsTab({ repositoryId, status }: Props) {
    const [metricsData, setMetricsData] = useState<MetricsPayload | null>(null);
    const [qualityReport, setQuality] = useState<QualityReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Feedback form
    const [responseId, setResponseId] = useState("");
    const [usefulness, setUsefulness] = useState(3);
    const [correctness, setCorrectness] = useState(3);
    const [comment, setComment] = useState("");
    const [fbStatus, setFbStatus] = useState<"idle" | "sending" | "sent">(
        "idle",
    );

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
        } catch {
            setError("Falha ao carregar métricas.");
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
            setResponseId("");
            setComment("");
            setUsefulness(3);
            setCorrectness(3);
            setTimeout(() => {
                setFbStatus("idle");
                load();
            }, 2000);
        } catch {
            setError("Falha ao enviar feedback.");
            setFbStatus("idle");
        }
    }

    if (status !== "completed") {
        return (
            <Card>
                <EmptyState
                    icon="chart-bar"
                    title="Indexe um repositório primeiro"
                />
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <div className="py-10 flex justify-center">
                    <ThinkingDots label="Carregando métricas…" />
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <ErrorBanner message={error} onClose={() => setError("")} />
            )}

            {/* Quality gauge + summary */}
            {qualityReport && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="flex flex-col items-center justify-center">
                        <QualityGauge
                            score={qualityReport.overall_quality_score * 100}
                            label={qualityReport.quality_label}
                        />
                        <p className="text-xs text-gray-400 text-center mt-1">
                            Score de qualidade geral
                        </p>
                    </Card>
                    <Card className="md:col-span-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Resumo do período
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {qualityReport.summary}
                        </p>
                        {qualityReport.period_start && (
                            <p className="text-xs text-gray-400 mt-3">
                                {new Date(
                                    qualityReport.period_start,
                                ).toLocaleDateString("pt-BR")}{" "}
                                →{" "}
                                {new Date(
                                    qualityReport.period_end,
                                ).toLocaleDateString("pt-BR")}
                            </p>
                        )}
                        <button
                            onClick={load}
                            className={`${btnSecondary} mt-3 text-xs`}
                        >
                            <Icon name="rotate" /> Atualizar
                        </button>
                    </Card>
                </div>
            )}

            {/* Metrics grid */}
            {metricsData && (
                <Card title="Métricas Detalhadas">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(
                            Object.keys(METRIC_INFO) as (keyof MetricsPayload)[]
                        ).map((key) => {
                            const { label, desc, format } = METRIC_INFO[key];
                            const value = metricsData[key];
                            return (
                                <div
                                    key={key}
                                    className="bg-gray-50 rounded-lg border border-gray-200 p-3"
                                >
                                    <p className="text-lg font-bold text-gray-900">
                                        {format(value)}
                                    </p>
                                    <p className="text-xs font-medium text-gray-600 mt-0.5">
                                        {label}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                                        {desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Feedback form */}
            <Card title="Avaliar uma Resposta">
                {fbStatus === "sent" ? (
                    <div className="py-8 text-center">
                        <Icon
                            name="circle-check"
                            className="text-5xl text-green-500 mb-3"
                        />
                        <p className="text-sm font-medium text-green-700">
                            Feedback enviado com sucesso!
                        </p>
                    </div>
                ) : (
                    <form onSubmit={onFeedback} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ID da Resposta
                            </label>
                            <input
                                value={responseId}
                                onChange={(e) => setResponseId(e.target.value)}
                                placeholder="response_..."
                                required
                                className={inputCls}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Utilidade
                                </label>
                                <StarRating
                                    value={usefulness}
                                    onChange={setUsefulness}
                                />
                                <p className="text-xs text-gray-400 mt-0.5">
                                    A resposta foi útil para você?
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Precisão
                                </label>
                                <StarRating
                                    value={correctness}
                                    onChange={setCorrectness}
                                />
                                <p className="text-xs text-gray-400 mt-0.5">
                                    A informação estava correta?
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Comentário (opcional)
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={2}
                                placeholder="Algo que poderia ser melhorado?"
                                className={`${inputCls} resize-none`}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={
                                fbStatus === "sending" || !responseId.trim()
                            }
                            className={btnPrimary}
                        >
                            {fbStatus === "sending" ? (
                                <>
                                    <Icon
                                        name="spinner"
                                        className="animate-spin"
                                    />{" "}
                                    Enviando…
                                </>
                            ) : (
                                <>
                                    <Icon name="paper-plane" /> Enviar Feedback
                                </>
                            )}
                        </button>
                    </form>
                )}
            </Card>
        </div>
    );
}
