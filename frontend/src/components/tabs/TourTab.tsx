import { useState } from "react";
import {
    generateTour,
    getTour,
    listTours,
    type TourResponse,
    type TourSummary,
    type TourListResponse,
} from "../../services/tourApi";
import {
    Card,
    ProgressBar,
    ThinkingDots,
    EmptyState,
    btnPrimary,
    btnSecondary,
    inputCls,
    Icon,
} from "../ui";

interface Props {
    repositoryId: string;
    status: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    complexity: "Complexidade",
    churn: "Frequência de Mudança",
    coupling: "Acoplamento",
};

export function TourTab({ repositoryId, status }: Props) {
    const [tour, setTour] = useState<TourResponse | null>(null);
    const [savedTours, setSavedTours] = useState<TourSummary[]>([]);
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [toursLoaded, setToursLoaded] = useState(false);

    const [topK, setTopK] = useState(5);
    const [complexityW, setComplexityW] = useState(0.4);
    const [churnW, setChurnW] = useState(0.3);
    const [couplingW, setCouplingW] = useState(0.3);

    const weightSum = complexityW + churnW + couplingW;
    const weightsOk = Math.abs(weightSum - 1.0) < 0.01;

    async function loadSavedTours() {
        if (toursLoaded) return;
        try {
            const r: TourListResponse = await listTours(repositoryId);
            setSavedTours(r.tours);
            setToursLoaded(true);
        } catch {}
    }

    async function onGenerate() {
        setError("");
        setLoading(true);
        try {
            const t = await generateTour(repositoryId, {
                topK,
                complexityWeight: complexityW,
                churnWeight: churnW,
                couplingWeight: couplingW,
            });
            setTour(t);
            setStep(0);
            await loadSavedTours();
        } catch {
            setError("Falha ao gerar tour. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }

    async function onOpenSaved(id: string) {
        setError("");
        setLoading(true);
        try {
            setTour(await getTour(id));
            setStep(0);
        } catch {
            setError("Falha ao carregar tour.");
        } finally {
            setLoading(false);
        }
    }

    // ── States ────────────────────────────────────────────────────────────────

    if (status !== "completed") {
        return (
            <Card>
                <EmptyState
                    icon="route"
                    title="Indexe um repositório primeiro"
                    description="O tour guiado estará disponível após a indexação ser concluída."
                />
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <div className="py-12 flex flex-col items-center gap-4">
                    <ThinkingDots label="Analisando módulos e gerando tour guiado…" />
                    <p className="text-sm text-gray-500">
                        Isso pode levar alguns segundos
                    </p>
                </div>
            </Card>
        );
    }

    if (!tour) {
        return (
            <div className="space-y-4">
                <Card title="Configurar Tour Guiado">
                    <p className="text-sm text-gray-500 mb-5">
                        O tour analisa automaticamente os módulos mais críticos
                        do repositório — por complexidade, frequência de
                        mudanças e acoplamento — e gera um roteiro de onboarding
                        personalizado.
                    </p>

                    {/* Top-K */}
                    <div className="mb-5">
                        <div className="flex justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700">
                                Número de módulos no tour
                            </label>
                            <span className="text-sm font-bold text-indigo-600">
                                {topK}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={3}
                            max={15}
                            value={topK}
                            onChange={(e) => setTopK(Number(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Recomendado: 5 a 8 para onboarding inicial
                        </p>
                    </div>

                    {/* Pesos */}
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                        Critérios de seleção dos módulos
                    </p>
                    <div className="space-y-4 mb-4">
                        {[
                            {
                                label: "Complexidade do código",
                                desc: "Prioriza módulos com maior complexidade ciclomática",
                                val: complexityW,
                                set: setComplexityW,
                            },
                            {
                                label: "Frequência de mudanças",
                                desc: "Prioriza módulos mais frequentemente modificados",
                                val: churnW,
                                set: setChurnW,
                            },
                            {
                                label: "Acoplamento entre módulos",
                                desc: "Prioriza módulos com mais dependências",
                                val: couplingW,
                                set: setCouplingW,
                            },
                        ].map(({ label, desc, val, set }) => (
                            <div key={label}>
                                <div className="flex justify-between mb-1">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            {label}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {desc}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 ml-4 shrink-0">
                                        {(val * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={val}
                                    onChange={(e) =>
                                        set(Number(e.target.value))
                                    }
                                    className="w-full accent-indigo-600"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span
                            className={`text-sm font-medium ${weightsOk ? "text-green-600" : "text-amber-600"}`}
                        >
                            {weightsOk ? (
                                <>
                                    <Icon
                                        name="circle-check"
                                        className="mr-1"
                                    />
                                    Pesos válidos (soma = 100%)
                                </>
                            ) : (
                                <>
                                    <Icon
                                        name="triangle-exclamation"
                                        className="mr-1"
                                    />
                                    Soma atual: {(weightSum * 100).toFixed(0)}%
                                    (deve ser 100%)
                                </>
                            )}
                        </span>
                        <button
                            onClick={onGenerate}
                            disabled={loading}
                            className={btnPrimary}
                        >
                            <Icon name="route" /> Gerar Tour Guiado
                        </button>
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 mt-2">{error}</p>
                    )}
                </Card>

                {/* Saved tours */}
                {!toursLoaded && (
                    <button onClick={loadSavedTours} className={btnSecondary}>
                        <Icon name="folder-open" /> Ver tours anteriores
                    </button>
                )}
                {toursLoaded && savedTours.length > 0 && (
                    <Card title="Tours Anteriores">
                        <div className="space-y-2">
                            {savedTours.map((t) => (
                                <button
                                    key={t.tour_id}
                                    onClick={() => onOpenSaved(t.tour_id)}
                                    className="w-full text-left flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">
                                            {t.title}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {t.step_count} módulos
                                            {t.created_at
                                                ? ` · ${new Date(t.created_at).toLocaleString("pt-BR")}`
                                                : ""}
                                        </p>
                                    </div>
                                    <span className="text-indigo-400">
                                        <Icon name="arrow-right" />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>
                )}
                {toursLoaded && savedTours.length === 0 && (
                    <p className="text-sm text-gray-400 text-center">
                        Nenhum tour salvo ainda.
                    </p>
                )}
            </div>
        );
    }

    // ── Tour viewer ────────────────────────────────────────────────────────────
    const currentStep = tour.steps[step];
    const pct = Math.round(((step + 1) / tour.step_count) * 100);

    return (
        <div className="space-y-4">
            {/* Header */}
            <Card>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {tour.title}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {tour.description}
                        </p>
                    </div>
                    <button
                        onClick={() => setTour(null)}
                        className="text-gray-300 hover:text-gray-500 text-2xl ml-4 leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Progress */}
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>
                        Módulo {step + 1} de {tour.step_count}
                    </span>
                    <span>{pct}% concluído</span>
                </div>
                <ProgressBar value={step + 1} max={tour.step_count} />

                {/* Step indicators */}
                <div className="flex gap-1 mt-2 flex-wrap">
                    {tour.steps.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`h-1.5 rounded-full transition-all ${
                                i < step
                                    ? "bg-indigo-300"
                                    : i === step
                                      ? "bg-indigo-600 w-6"
                                      : "bg-gray-200"
                            } w-${i === step ? "6" : "3"}`}
                            style={{ width: i === step ? "24px" : "12px" }}
                        />
                    ))}
                </div>
            </Card>

            {/* Current step card */}
            {currentStep && (
                <Card className="border-l-4 border-indigo-500">
                    {/* Module path */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            Módulo {step + 1}/{tour.step_count}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                            score: {currentStep.score.toFixed(3)}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {currentStep.title}
                    </h3>
                    <p className="text-xs font-mono text-gray-400 mb-4">
                        {currentStep.module_name}
                    </p>

                    {/* Why important */}
                    <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-4">
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                            🎯 Por que este módulo é importante?
                        </p>
                        <p className="text-sm text-amber-900">
                            {currentStep.rationale}
                        </p>
                    </div>

                    {/* Recommendations */}
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            <Icon name="book-open" className="mr-1" /> Como
                            explorar este módulo
                        </p>
                        <ul className="space-y-2">
                            {currentStep.recommendations.map((rec, i) => (
                                <li
                                    key={i}
                                    className="flex gap-2 text-sm text-gray-700"
                                >
                                    <span className="text-indigo-500 shrink-0 font-bold">
                                        {i + 1}.
                                    </span>
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Metrics */}
                    <details>
                        <summary className="cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600">
                            <Icon name="chart-bar" className="mr-1" /> Métricas
                            do módulo
                        </summary>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                            <div className="bg-red-50 rounded-lg border border-red-100 p-3">
                                <p className="text-xl font-bold text-red-700">
                                    {(
                                        currentStep.metrics.complexity[
                                            "avg_complexity"
                                        ] as number | undefined
                                    )?.toFixed(1) ?? "—"}
                                </p>
                                <p className="text-xs text-red-500 mt-0.5">
                                    Complexidade média
                                </p>
                            </div>
                            <div className="bg-blue-50 rounded-lg border border-blue-100 p-3">
                                <p className="text-xl font-bold text-blue-700">
                                    {(currentStep.metrics.churn[
                                        "total_commits"
                                    ] as number | undefined) ?? 0}
                                </p>
                                <p className="text-xs text-blue-500 mt-0.5">
                                    Commits totais
                                </p>
                            </div>
                            <div className="bg-purple-50 rounded-lg border border-purple-100 p-3">
                                <p className="text-xl font-bold text-purple-700">
                                    {(currentStep.metrics.coupling[
                                        "unique_dependencies"
                                    ] as number | undefined) ?? 0}
                                </p>
                                <p className="text-xs text-purple-500 mt-0.5">
                                    Dependências únicas
                                </p>
                            </div>
                        </div>
                    </details>
                </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setStep((s) => s - 1)}
                    disabled={step === 0}
                    className={btnSecondary}
                >
                    <Icon name="chevron-left" /> Anterior
                </button>
                <span className="text-sm text-gray-400 flex-1 text-center">
                    {step + 1} / {tour.step_count}
                </span>
                {step < tour.step_count - 1 ? (
                    <button
                        onClick={() => setStep((s) => s + 1)}
                        className={btnPrimary}
                    >
                        Próximo <Icon name="chevron-right" />
                    </button>
                ) : (
                    <button
                        onClick={() => setTour(null)}
                        className={`${btnPrimary} bg-green-600 hover:bg-green-700`}
                    >
                        <Icon name="check" /> Concluir tour
                    </button>
                )}
            </div>
        </div>
    );
}
