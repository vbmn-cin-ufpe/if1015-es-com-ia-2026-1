import { useState, useEffect } from "react";
import {
    getTimeline,
    getWhyExplanation,
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

interface Props {
    repositoryId: string;
    status: string;
}

const CATEGORIES = [
    "bugfix",
    "feature",
    "refactor",
    "chore",
    "docs",
    "test",
    "style",
    "perf",
];

const CATEGORY_CONFIG: Record<
    string,
    { icon: string; label: string; color: string }
> = {
    bugfix: {
        icon: "bug",
        label: "Bugfix",
        color: "bg-red-50 border-red-200 text-red-700",
    },
    feature: {
        icon: "wand-magic-sparkles",
        label: "Feature",
        color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    refactor: {
        icon: "arrows-rotate",
        label: "Refator",
        color: "bg-purple-50 border-purple-200 text-purple-700",
    },
    chore: {
        icon: "wrench",
        label: "Manutenção",
        color: "bg-gray-50 border-gray-200 text-gray-700",
    },
    docs: {
        icon: "book",
        label: "Documentação",
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
    },
    test: {
        icon: "flask",
        label: "Testes",
        color: "bg-green-50 border-green-200 text-green-700",
    },
    style: {
        icon: "palette",
        label: "Estilo",
        color: "bg-pink-50 border-pink-200 text-pink-700",
    },
    perf: {
        icon: "bolt",
        label: "Performance",
        color: "bg-amber-50 border-amber-200 text-amber-700",
    },
};

function categoryConf(cat: string) {
    return (
        CATEGORY_CONFIG[cat.toLowerCase()] ?? {
            icon: "📝",
            label: cat,
            color: "bg-gray-50 border-gray-200 text-gray-700",
        }
    );
}

function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export function HistoryTab({ repositoryId, status }: Props) {
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [moduleFilter, setModuleFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [whyModule, setWhyModule] = useState("");
    const [whyQuestion, setWhyQuestion] = useState("");
    const [whyResult, setWhyResult] = useState<WhyResponse | null>(null);
    const [whyLoading, setWhyLoading] = useState(false);

    useEffect(() => {
        if (status !== "completed") return;
        loadTimeline();
    }, [repositoryId, status]);

    async function loadTimeline(category?: string | null) {
        setError("");
        setLoading(true);
        try {
            const r = await getTimeline(repositoryId, {
                category: category ?? undefined,
                modulePath: moduleFilter || undefined,
                limit: 50,
            });
            setEntries(r.entries);
            setTotal(r.total);
        } catch {
            setError("Não foi possível carregar o histórico.");
        } finally {
            setLoading(false);
        }
    }

    function onFilterCategory(cat: string) {
        const next = activeCategory === cat ? null : cat;
        setActiveCategory(next);
        loadTimeline(next);
    }

    async function onAskWhy() {
        if (!whyModule.trim() || !whyQuestion.trim()) return;
        setWhyResult(null);
        setWhyLoading(true);
        try {
            setWhyResult(
                await getWhyExplanation(
                    repositoryId,
                    whyModule.trim(),
                    whyQuestion.trim(),
                ),
            );
        } catch {
            setError("Falha ao buscar explicação do módulo.");
        } finally {
            setWhyLoading(false);
        }
    }

    if (status !== "completed") {
        return (
            <Card>
                <EmptyState
                    icon="clock-rotate-left"
                    title="Indexe um repositório primeiro"
                />
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <ErrorBanner message={error} onClose={() => setError("")} />
            )}

            {/* Why panel */}
            <Card title="Por que um módulo mudou?">
                <p className="text-sm text-gray-500 mb-3">
                    Digite o caminho de um módulo e uma pergunta para obter uma
                    explicação histórica baseada nos commits.
                </p>
                <div className="flex gap-2 flex-wrap">
                    <input
                        value={whyModule}
                        onChange={(e) => setWhyModule(e.target.value)}
                        placeholder="app/services/auth_service.py"
                        className={`${inputCls} flex-1`}
                    />
                    <input
                        value={whyQuestion}
                        onChange={(e) => setWhyQuestion(e.target.value)}
                        placeholder="Por que este módulo foi refatorado?"
                        className={`${inputCls} flex-1`}
                    />
                    <button
                        onClick={onAskWhy}
                        disabled={
                            whyLoading ||
                            !whyModule.trim() ||
                            !whyQuestion.trim()
                        }
                        className={btnPrimary}
                    >
                        {whyLoading ? (
                            <>
                                <Icon name="spinner" className="animate-spin" />{" "}
                                Analisando…
                            </>
                        ) : (
                            <>
                                <Icon name="magnifying-glass" /> Explicar
                            </>
                        )}
                    </button>
                </div>

                {whyLoading && (
                    <div className="mt-4 flex justify-center py-4">
                        <ThinkingDots label="Analisando histórico de commits…" />
                    </div>
                )}

                {whyResult && !whyLoading && (
                    <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3">
                        <p className="text-sm text-indigo-900 leading-relaxed">
                            {whyResult.explanation}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-indigo-500">
                                Confiança:
                            </span>
                            <div className="flex-1 h-1.5 bg-indigo-200 rounded-full">
                                <div
                                    className="h-1.5 bg-indigo-500 rounded-full"
                                    style={{
                                        width: `${(whyResult.confidence * 100).toFixed(0)}%`,
                                    }}
                                />
                            </div>
                            <span className="text-xs font-bold text-indigo-700">
                                {(whyResult.confidence * 100).toFixed(0)}%
                            </span>
                        </div>
                        {whyResult.supporting_commits.length > 0 && (
                            <details>
                                <summary className="text-xs cursor-pointer text-indigo-500 hover:text-indigo-700">
                                    {whyResult.supporting_commits.length}{" "}
                                    commit(s) relevante(s)
                                </summary>
                                <ul className="mt-2 space-y-1">
                                    {whyResult.supporting_commits.map((c) => {
                                        const cc = categoryConf(c.category);
                                        return (
                                            <li
                                                key={c.commit_id}
                                                className="flex gap-2 text-xs items-start"
                                            >
                                                <Icon
                                                    name={cc.icon}
                                                    className="shrink-0 mt-0.5"
                                                />
                                                <span className="text-gray-500 shrink-0">
                                                    {formatDate(c.timestamp)}
                                                </span>
                                                <span className="text-gray-700">
                                                    {c.summary}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </details>
                        )}
                    </div>
                )}
            </Card>

            {/* Timeline */}
            <Card title="Linha do Tempo">
                {/* Category filters */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {CATEGORIES.map((cat) => {
                        const cc = categoryConf(cat);
                        return (
                            <button
                                key={cat}
                                onClick={() => onFilterCategory(cat)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                                    activeCategory === cat
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "border-gray-200 text-gray-600 hover:border-indigo-400"
                                }`}
                            >
                                <Icon name={cc.icon} /> {cc.label}
                            </button>
                        );
                    })}
                    {activeCategory && (
                        <button
                            onClick={() => {
                                setActiveCategory(null);
                                loadTimeline(null);
                            }}
                            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 flex items-center gap-1.5"
                        >
                            <Icon name="xmark" /> Limpar filtro
                        </button>
                    )}
                </div>

                {/* Module input */}
                <div className="flex gap-2 mb-4">
                    <input
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        placeholder="Filtrar por módulo (caminho parcial)…"
                        className={`${inputCls} flex-1`}
                    />
                    <button
                        onClick={() => loadTimeline(activeCategory)}
                        className={btnSecondary}
                    >
                        <Icon name="rotate" />
                    </button>
                </div>

                {loading && (
                    <div className="py-6 flex justify-center">
                        <ThinkingDots label="Carregando histórico…" />
                    </div>
                )}

                {!loading && entries.length === 0 && (
                    <EmptyState
                        icon="clock-rotate-left"
                        title="Nenhum evento encontrado"
                        description="Tente remover os filtros ou indexar novamente."
                    />
                )}

                {!loading && entries.length > 0 && (
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                        <ul className="space-y-4 pl-12">
                            {entries.map((entry) => {
                                const cc = categoryConf(entry.category);
                                return (
                                    <li key={entry.id} className="relative">
                                        {/* Dot */}
                                        <div
                                            className={`absolute -left-8 top-1 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm ${cc.color}`}
                                        >
                                            <Icon name={cc.icon} />
                                        </div>
                                        <div
                                            className={`rounded-lg border p-3 ${cc.color} bg-opacity-50`}
                                        >
                                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                                <p className="text-sm text-gray-800 flex-1">
                                                    {entry.summary}
                                                </p>
                                                <span className="text-xs text-gray-400 shrink-0">
                                                    {formatDate(
                                                        entry.timestamp,
                                                    )}
                                                </span>
                                            </div>
                                            {entry.touched_modules.length >
                                                0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {entry.touched_modules
                                                        .slice(0, 4)
                                                        .map((m) => (
                                                            <span
                                                                key={m}
                                                                className="text-xs font-mono bg-white bg-opacity-60 border border-current border-opacity-20 px-1.5 py-0.5 rounded"
                                                            >
                                                                {m
                                                                    .split("/")
                                                                    .pop()}
                                                            </span>
                                                        ))}
                                                    {entry.touched_modules
                                                        .length > 4 && (
                                                        <span className="text-xs text-gray-400">
                                                            +
                                                            {entry
                                                                .touched_modules
                                                                .length -
                                                                4}{" "}
                                                            mais
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="mt-1 flex items-center gap-1">
                                                <span className="text-xs text-gray-400">
                                                    Confiança:
                                                </span>
                                                <div className="flex gap-0.5">
                                                    {Array.from({
                                                        length: 5,
                                                    }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-1.5 h-1.5 rounded-full ${i < Math.round(entry.confidence * 5) ? "bg-current opacity-70" : "bg-gray-200"}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                {!loading && total > entries.length && (
                    <p className="text-xs text-gray-400 text-center mt-4">
                        Mostrando {entries.length} de {total} eventos
                    </p>
                )}
            </Card>
        </div>
    );
}
