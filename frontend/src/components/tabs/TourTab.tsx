import { useState } from "react";
import {
    generateTour,
    generateNoviceTour,
    getTour,
    listTours,
    type TourResponse,
    type TourSummary,
    type TourListResponse,
    type TourFileDetail,
} from "../../services/tourApi";
import {
    Card,
    ProgressBar,
    ThinkingDots,
    EmptyState,
    btnPrimary,
    btnSecondary,
    Icon,
} from "../ui";

interface Props {
    repositoryId: string;
    status: string;
}

// ── File relevance filter ──────────────────────────────────────────────────

const IRRELEVANT_PATTERNS = [
    "__pycache__", ".pyc", ".pyo", ".pyd",
    "node_modules", ".min.js", ".min.css", ".bundle.", ".map",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Pipfile.lock",
    "poetry.lock", "composer.lock", "Gemfile.lock",
    ".class", ".jar", ".war", ".dll", ".so", ".exe",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".woff", ".ttf", ".eot",
    ".DS_Store", "Thumbs.db", ".gitkeep",
    "dist/", "build/", "target/", ".next/", "__snapshots__",
    "migrations/",
];

function isRelevantFile(path: string): boolean {
    const p = path.toLowerCase();
    return !IRRELEVANT_PATTERNS.some((x) => p.includes(x));
}

function scoreFile(f: TourFileDetail): number {
    return f.complexity * 0.5 + f.commits * 0.3 + f.loc * 0.001 + f.dependencies * 0.2;
}

// ── File extension badge ───────────────────────────────────────────────────

function fileIcon(fname: string): { label: string; color: string } {
    if (fname.endsWith(".ts") || fname.endsWith(".tsx")) return { label: "ts", color: "#3178c6" };
    if (fname.endsWith(".js") || fname.endsWith(".jsx")) return { label: "js", color: "#f0db4f" };
    if (fname.endsWith(".py")) return { label: "py", color: "#3572A5" };
    if (fname.endsWith(".java")) return { label: "java", color: "#b07219" };
    if (fname.endsWith(".go")) return { label: "go", color: "#00ADD8" };
    if (fname.endsWith(".rb")) return { label: "rb", color: "#701516" };
    if (fname.endsWith(".rs")) return { label: "rs", color: "#DEA584" };
    if (fname.endsWith(".cs")) return { label: "cs", color: "#178600" };
    if (fname.endsWith(".cpp") || fname.endsWith(".cc") || fname.endsWith(".c")) return { label: "c++", color: "#f34b7d" };
    if (fname.endsWith(".json")) return { label: "json", color: "#6b7280" };
    if (fname.endsWith(".yaml") || fname.endsWith(".yml")) return { label: "yml", color: "#cb171e" };
    if (fname.endsWith(".md")) return { label: "md", color: "#083fa1" };
    if (fname.endsWith(".html") || fname.endsWith(".htm")) return { label: "html", color: "#e34c26" };
    if (fname.endsWith(".css") || fname.endsWith(".scss")) return { label: "css", color: "#563d7c" };
    if (fname.endsWith(".sh") || fname.endsWith(".bash")) return { label: "sh", color: "#4eaa25" };
    return { label: "txt", color: "#9ca3af" };
}

// ── Module type badge ──────────────────────────────────────────────────────

function moduleTypeBadge(name: string): { label: string; cls: string } {
    const n = name.toLowerCase();
    if (n.includes("controller") || n.includes("route") || n.includes("handler") || n.includes("endpoint"))
        return { label: "Controller", cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" };
    if (n.includes("service") || n.includes("use-case") || n.includes("usecase") || n.includes("interactor"))
        return { label: "Service", cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
    if (n.includes("model") || n.includes("entity") || n.includes("schema") || n.includes("domain"))
        return { label: "Model", cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" };
    if (n.includes("util") || n.includes("helper") || n.includes("common") || n.includes("shared"))
        return { label: "Utilitário", cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" };
    if (n.includes("module") || n.includes("core") || n.includes("app") || n.includes("main"))
        return { label: "Core", cls: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" };
    if (n.includes("guard") || n.includes("middleware") || n.includes("interceptor") || n.includes("filter"))
        return { label: "Middleware", cls: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" };
    if (n.includes("test") || n.includes("spec") || n.includes("mock"))
        return { label: "Teste", cls: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" };
    if (n.includes("infra") || n.includes("repository") || n.includes("adapter") || n.includes("client"))
        return { label: "Infra", cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" };
    return { label: "Módulo", cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" };
}

// ── VS Code-style file tree ────────────────────────────────────────────────

function FileTree({ files, moduleName }: { files: TourFileDetail[]; moduleName: string }) {
    const [activeFile, setActiveFile] = useState<string | null>(null);

    const relevant = files.filter((f) => isRelevantFile(f.path));
    const sorted = [...relevant].sort((a, b) => scoreFile(b) - scoreFile(a));
    const hotFile = sorted[0]?.path ?? null;
    const focused = activeFile ?? hotFile;

    const dirs = new Map<string, TourFileDetail[]>();
    for (const f of sorted) {
        const parts = f.path.replace(/\\/g, "/").split("/");
        const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
        if (!dirs.has(dir)) dirs.set(dir, []);
        dirs.get(dir)!.push(f);
    }

    const maxCommits = Math.max(...sorted.map((f) => f.commits), 1);
    const maxComplexity = Math.max(...sorted.map((f) => f.complexity), 1);
    const maxDeps = Math.max(...sorted.map((f) => f.dependencies), 1);
    const filteredCount = files.length - relevant.length;

    return (
        <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-[#3c3c3c] shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
                <span className="text-[11px] font-bold text-[#bbb] uppercase tracking-widest flex items-center gap-2">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="#888">
                        <path d="M14.5 3H7.707L6.5 1.5h-5A1.5 1.5 0 0 0 0 3v10a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V4.5A1.5 1.5 0 0 0 14.5 3zm0 10h-13V3h4.293l1.207 1.5H14.5V13z" />
                    </svg>
                    Explorer
                </span>
                <div className="flex items-center gap-2">
                    {filteredCount > 0 && (
                        <span className="text-[10px] text-[#666]" title={`${filteredCount} arquivos irrelevantes ocultados`}>
                            {filteredCount} oculto{filteredCount > 1 ? "s" : ""}
                        </span>
                    )}
                    <span className="text-[10px] text-[#666]">{relevant.length} arq.</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-[#1e1e1e] border-b border-[#2a2a2a]">
                <span className="flex items-center gap-1 text-[9px] text-[#666]">
                    <span className="inline-block w-2 h-1.5 rounded-sm bg-[#f14c4c]" /> complexidade
                </span>
                <span className="flex items-center gap-1 text-[9px] text-[#666]">
                    <span className="inline-block w-2 h-1.5 rounded-sm bg-[#569cd6]" /> commits
                </span>
                <span className="flex items-center gap-1 text-[9px] text-[#666]">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> mais crítico
                </span>
            </div>

            {/* Tree */}
            <div className="max-h-72 overflow-y-auto font-mono text-xs">
                {[...dirs.entries()].map(([dir, dirFiles], di) => (
                    <div key={di}>
                        {dir && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#252526] sticky top-0 z-10 border-b border-[#2a2a2a]">
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="#dcb67a">
                                    <path d="M14.5 3H7.707L6.5 1.5h-5A1.5 1.5 0 0 0 0 3v10a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V4.5A1.5 1.5 0 0 0 14.5 3z" />
                                </svg>
                                <span className="text-[#dcb67a] text-[11px] truncate">{dir.split("/").pop()}</span>
                                <span className="text-[#555] text-[9px] truncate opacity-60">{dir}</span>
                            </div>
                        )}

                        {dirFiles.map((f, fi) => {
                            const ico = fileIcon(f.name);
                            const isHot = f.path === hotFile;
                            const isFocused = f.path === focused;
                            const commitPct = (f.commits / maxCommits) * 100;
                            const complexityPct = (f.complexity / maxComplexity) * 100;
                            const isLast = fi === dirFiles.length - 1;

                            return (
                                <button
                                    key={fi}
                                    onClick={() => setActiveFile(f.path === activeFile ? null : f.path)}
                                    className={`w-full text-left border-b border-[#2a2a2a] last:border-0 transition-colors ${
                                        isFocused ? "bg-[#37373d]" : "hover:bg-[#2a2d2e]"
                                    }`}
                                >
                                    {/* File row */}
                                    <div className="flex items-center gap-1.5 px-3 py-1.5">
                                        <span className="text-[#555] select-none w-4 shrink-0 text-center text-[11px]">
                                            {isLast ? "└" : "├"}
                                        </span>
                                        {isHot && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" title="Arquivo mais crítico" />
                                        )}
                                        <span
                                            className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded leading-none"
                                            style={{ backgroundColor: ico.color + "33", color: ico.color, border: `1px solid ${ico.color}55` }}
                                        >
                                            {ico.label}
                                        </span>
                                        <span className={`truncate flex-1 text-[11px] ${isFocused ? "text-white font-semibold" : isHot ? "text-amber-300" : "text-[#d4d4d4]"}`}>
                                            {f.name}
                                        </span>
                                        {f.loc > 0 && <span className="text-[#555] text-[9px] shrink-0">{f.loc}L</span>}
                                    </div>

                                    {/* Expanded metrics */}
                                    {isFocused && (
                                        <div className="px-3 pb-2 pl-9 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#f14c4c] text-[9px] w-16 shrink-0">complexidade</span>
                                                <div className="flex-1 h-1 bg-[#333] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#f14c4c] rounded-full" style={{ width: `${complexityPct}%` }} />
                                                </div>
                                                <span className="text-[#f14c4c] text-[9px] w-6 text-right font-bold">{f.complexity}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#569cd6] text-[9px] w-16 shrink-0">commits</span>
                                                <div className="flex-1 h-1 bg-[#333] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#569cd6] rounded-full" style={{ width: `${commitPct}%` }} />
                                                </div>
                                                <span className="text-[#569cd6] text-[9px] w-6 text-right font-bold">{f.commits}</span>
                                            </div>
                                            {f.dependencies > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[#c586c0] text-[9px] w-16 shrink-0">deps</span>
                                                    <div className="flex-1 h-1 bg-[#333] rounded-full overflow-hidden">
                                                        <div className="h-full bg-[#c586c0] rounded-full" style={{ width: `${(f.dependencies / maxDeps) * 100}%` }} />
                                                    </div>
                                                    <span className="text-[#c586c0] text-[9px] w-6 text-right font-bold">{f.dependencies}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}

                {relevant.length === 0 && (
                    <div className="px-4 py-6 text-center text-[#666] text-xs">Nenhum arquivo de código encontrado</div>
                )}
            </div>
        </div>
    );
}

// ── Module navigator sidebar ───────────────────────────────────────────────

function ModuleNavigator({ tour, currentStep, onSelect }: {
    tour: TourResponse;
    currentStep: number;
    onSelect: (i: number) => void;
}) {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Icon name="list-check" className="text-indigo-400" />
                    Módulos do tour
                </p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50 max-h-[520px] overflow-y-auto">
                {tour.steps.map((s, i) => {
                    const isActive = i === currentStep;
                    const isDone = i < currentStep;
                    const badge = moduleTypeBadge(s.module_name);
                    const shortName = s.module_name.replace(/\\/g, "/").split("/").pop() ?? s.module_name;
                    return (
                        <button
                            key={i}
                            onClick={() => onSelect(i)}
                            className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors border-l-2 ${
                                isActive
                                    ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent"
                            }`}
                        >
                            <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                                isActive ? "bg-indigo-600 text-white"
                                    : isDone ? "bg-emerald-500 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            }`}>
                                {isDone ? "✓" : i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold truncate ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                                    {shortName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                                    <span className="text-[9px] text-gray-400 font-mono">{s.score.toFixed(2)}</span>
                                </div>
                                <div className="mt-1 h-0.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${isActive ? "bg-indigo-500" : isDone ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"}`}
                                        style={{ width: `${Math.min(s.score * 200, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main export ────────────────────────────────────────────────────────────

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
                topK, complexityWeight: complexityW,
                churnWeight: churnW, couplingWeight: couplingW,
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

    async function onGenerateNovice() {
        setError("");
        setLoading(true);
        try {
            const t = await generateNoviceTour(repositoryId, topK);
            setTour(t);
            setStep(0);
            await loadSavedTours();
        } catch {
            setError("Falha ao gerar tour para novatos. Tente novamente.");
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
                <div className="py-16 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Icon name="route" className="text-2xl text-indigo-500 animate-pulse" />
                    </div>
                    <ThinkingDots label="Analisando módulos e gerando tour guiado…" />
                    <p className="text-sm text-gray-400">Isso pode levar alguns segundos</p>
                </div>
            </Card>
        );
    }

    if (!tour) {
        return (
            <div className="space-y-4">
                <Card>
                    <div className="flex items-center gap-3 mb-5">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            <Icon name="route" className="text-lg" />
                        </span>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Configurar Tour Guiado</h2>
                            <p className="text-xs text-gray-400">Personalize os critérios de seleção dos módulos</p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        O tour analisa automaticamente os módulos mais críticos do repositório — por complexidade,
                        frequência de mudanças e acoplamento — e gera um roteiro de onboarding personalizado.
                    </p>

                    <div className="mb-6">
                        <div className="flex justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Icon name="layer-group" className="text-indigo-400" /> Número de módulos no tour
                            </label>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{topK}</span>
                        </div>
                        <input type="range" min={3} max={15} value={topK}
                            onChange={(e) => setTopK(Number(e.target.value))}
                            className="w-full accent-indigo-600" />
                        <p className="text-xs text-gray-400 mt-1">Recomendado: 5 a 8 para onboarding inicial</p>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Icon name="sliders" className="text-indigo-400" /> Critérios de seleção
                    </p>
                    <div className="space-y-4 mb-5">
                        {[
                            { label: "Complexidade do código", icon: "fire", color: "text-red-400", desc: "Módulos com maior complexidade ciclomática", val: complexityW, set: setComplexityW },
                            { label: "Frequência de mudanças", icon: "arrows-rotate", color: "text-blue-400", desc: "Módulos mais frequentemente modificados", val: churnW, set: setChurnW },
                            { label: "Acoplamento entre módulos", icon: "link", color: "text-purple-400", desc: "Módulos com mais dependências externas", val: couplingW, set: setCouplingW },
                        ].map(({ label, icon, color, desc, val, set }) => (
                            <div key={label}>
                                <div className="flex justify-between mb-1">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                            <Icon name={icon} className={color} />{label}
                                        </p>
                                        <p className="text-xs text-gray-400">{desc}</p>
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 ml-4 shrink-0">
                                        {(val * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <input type="range" min={0} max={1} step={0.05} value={val}
                                    onChange={(e) => set(Number(e.target.value))}
                                    className="w-full accent-indigo-600" />
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        {/* Novice tour CTA */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                            <Icon name="graduation-cap" className="text-emerald-600 dark:text-emerald-400 text-xl shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sou novo no projeto</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tour otimizado para quem está chegando — começa pelos módulos mais acessíveis e bem conectados</p>
                            </div>
                            <button onClick={onGenerateNovice} className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors">
                                <Icon name="graduation-cap" /> Tour Novato
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium flex items-center gap-1.5 ${weightsOk ? "text-emerald-600" : "text-amber-600"}`}>
                                <Icon name={weightsOk ? "circle-check" : "triangle-exclamation"} />
                                {weightsOk ? "Pesos válidos (soma = 100%)" : `Soma atual: ${(weightSum * 100).toFixed(0)}% (deve ser 100%)`}
                            </span>
                            <button onClick={onGenerate} disabled={!weightsOk} className={btnPrimary}>
                                <Icon name="route" /> Gerar Tour Personalizado
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
                </Card>

                {!toursLoaded && (
                    <button onClick={loadSavedTours} className={btnSecondary}>
                        <Icon name="clock-rotate-left" /> Ver tours anteriores
                    </button>
                )}
                {toursLoaded && savedTours.length > 0 && (
                    <Card title="Tours anteriores">
                        <div className="space-y-2">
                            {savedTours.map((t) => (
                                <button key={t.tour_id} onClick={() => onOpenSaved(t.tour_id)}
                                    className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {t.step_count} módulos{t.created_at ? ` · ${new Date(t.created_at).toLocaleString("pt-BR")}` : ""}
                                        </p>
                                    </div>
                                    <Icon name="arrow-right" className="text-indigo-400" />
                                </button>
                            ))}
                        </div>
                    </Card>
                )}
                {toursLoaded && savedTours.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">Nenhum tour salvo ainda.</p>
                )}
            </div>
        );
    }

    // ── Tour viewer ────────────────────────────────────────────────────────

    const currentStepData = tour.steps[step];
    const pct = Math.round(((step + 1) / tour.step_count) * 100);
    const badge = moduleTypeBadge(currentStepData?.module_name ?? "");

    return (
        <div className="space-y-3">
            {/* Top bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{tour.title}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tour.description}</p>
                    </div>
                    <button onClick={() => setTour(null)}
                        className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none shrink-0 mt-0.5"
                        title="Fechar tour">×</button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Módulo <strong className="text-indigo-600 dark:text-indigo-400">{step + 1}</strong> de {tour.step_count}</span>
                    <span>{pct}% concluído</span>
                </div>
                <ProgressBar value={step + 1} max={tour.step_count} />
            </div>

            {/* 3-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_260px] gap-3">

                {/* LEFT: Module navigator */}
                <div className="hidden lg:block">
                    <ModuleNavigator tour={tour} currentStep={step} onSelect={setStep} />
                </div>

                {/* CENTER: Module content */}
                {currentStepData && (
                    <div className="space-y-3">
                        {/* Module header */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400" />
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-semibold">
                                        #{step + 1} de {tour.step_count}
                                    </span>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                                    <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full">
                                        score {currentStepData.score.toFixed(3)}
                                    </span>
                                </div>

                                {/* Breadcrumb */}
                                <div className="flex items-center gap-1 flex-wrap font-mono text-sm mb-1">
                                    {currentStepData.module_name.replace(/\\/g, "/").split("/").map((seg, si, arr) => (
                                        <span key={si} className="flex items-center gap-1">
                                            <span className={si === arr.length - 1
                                                ? "text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded"
                                                : "text-gray-400 dark:text-gray-500"}>
                                                {seg}
                                            </span>
                                            {si < arr.length - 1 && <span className="text-gray-300 dark:text-gray-600">/</span>}
                                        </span>
                                    ))}
                                </div>
                                {currentStepData.file_count !== undefined && (
                                    <p className="text-xs text-gray-400">
                                        {currentStepData.file_count} {currentStepData.file_count === 1 ? "arquivo" : "arquivos"} neste módulo
                                    </p>
                                )}

                                {/* Score breakdown */}
                                {currentStepData.score_breakdown && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Pontuação por critério</p>
                                        {[
                                            { key: "complexity", label: "Complexidade", color: "bg-red-400", icon: "fire", iconCls: "text-red-400" },
                                            { key: "churn", label: "Mudanças", color: "bg-blue-400", icon: "arrows-rotate", iconCls: "text-blue-400" },
                                            { key: "coupling", label: "Acoplamento", color: "bg-purple-400", icon: "link", iconCls: "text-purple-400" },
                                        ].map(({ key, label, color, icon, iconCls }) => {
                                            const val = (currentStepData.score_breakdown as Record<string, number>)[key] ?? 0;
                                            return (
                                                <div key={key} className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0 flex items-center gap-1">
                                                        <Icon name={icon} className={iconCls} />{label}
                                                    </span>
                                                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${color} transition-all duration-500`}
                                                            style={{ width: `${Math.round(val * 100)}%` }} />
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-400 w-8 text-right">{Math.round(val * 100)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Why important */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-5">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/50">
                                    <Icon name="bullseye" className="text-indigo-600 dark:text-indigo-400 text-[10px]" />
                                </span>
                                Por que este módulo é importante?
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentStepData.rationale}</p>
                        </div>

                        {/* How to explore */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                                    <Icon name="book-open" className="text-amber-500 text-[10px]" />
                                </span>
                                Como explorar este módulo
                            </p>
                            <ol className="space-y-3">
                                {currentStepData.recommendations.map((rec, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="shrink-0 w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{rec}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Mobile module navigator */}
                        <div className="lg:hidden">
                            <ModuleNavigator tour={tour} currentStep={step} onSelect={setStep} />
                        </div>
                    </div>
                )}

                {/* RIGHT: File tree + metrics */}
                <div className="space-y-3">
                    {currentStepData?.file_details && currentStepData.file_details.length > 0 ? (
                        <FileTree files={currentStepData.file_details} moduleName={currentStepData.module_name} />
                    ) : currentStepData?.files && currentStepData.files.length > 0 ? (
                        <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-[#3c3c3c] shadow-lg">
                            <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
                                <span className="text-[11px] font-bold text-[#bbb] uppercase tracking-widest">Explorer</span>
                                <span className="text-[10px] text-[#666]">{currentStepData.files.filter(isRelevantFile).length} arq.</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto font-mono">
                                {currentStepData.files.filter(isRelevantFile).map((f, i, arr) => {
                                    const fname = f.replace(/\\/g, "/").split("/").pop() ?? f;
                                    const ico = fileIcon(fname);
                                    return (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2a2a2a] last:border-0 hover:bg-[#2a2d2e]">
                                            <span className="text-[#555] w-4 text-center text-[11px]">{i === arr.length - 1 ? "└" : "├"}</span>
                                            <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded leading-none"
                                                style={{ backgroundColor: ico.color + "33", color: ico.color, border: `1px solid ${ico.color}55` }}>
                                                {ico.label}
                                            </span>
                                            <span className="text-[#d4d4d4] text-[11px] truncate">{fname}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {/* Metrics */}
                    {currentStepData && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Icon name="chart-bar" className="text-gray-400" /> Métricas do módulo
                            </p>
                            <div className="space-y-2">
                                {[
                                    { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-800", icon: "fire", iconCls: "text-red-400", label: "Complexidade média", sub: "ciclomática por arquivo", textCls: "text-red-500", valCls: "text-red-700 dark:text-red-400", value: (currentStepData.metrics.complexity["avg_complexity"] as number | undefined)?.toFixed(1) ?? "—" },
                                    { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-800", icon: "arrows-rotate", iconCls: "text-blue-400", label: "Total de commits", sub: "frequência de mudanças", textCls: "text-blue-500", valCls: "text-blue-700 dark:text-blue-400", value: String((currentStepData.metrics.churn["total_commits"] as number | undefined) ?? 0) },
                                    { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-100 dark:border-purple-800", icon: "link", iconCls: "text-purple-400", label: "Dependências únicas", sub: "acoplamento externo", textCls: "text-purple-500", valCls: "text-purple-700 dark:text-purple-400", value: String((currentStepData.metrics.coupling["unique_dependencies"] as number | undefined) ?? 0) },
                                ].map(({ bg, border, icon, iconCls, label, sub, textCls, valCls, value }) => (
                                    <div key={label} className={`flex items-center justify-between ${bg} border ${border} rounded-lg px-3 py-2.5`}>
                                        <div>
                                            <p className={`text-xs font-medium flex items-center gap-1.5 ${textCls}`}>
                                                <Icon name={icon} className={iconCls} /> {label}
                                            </p>
                                            <p className={`text-[10px] ${textCls} opacity-75`}>{sub}</p>
                                        </div>
                                        <p className={`text-xl font-bold font-mono ${valCls}`}>{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation bar */}
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm">
                <button onClick={() => setStep((s) => s - 1)} disabled={step === 0}
                    className={`${btnSecondary} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    <Icon name="chevron-left" /> Anterior
                </button>
                <div className="flex-1 text-center">
                    <span className="text-sm text-gray-500">
                        <strong className="text-gray-800 dark:text-gray-100">{step + 1}</strong>
                        <span className="text-gray-300 dark:text-gray-600"> / </span>
                        <span>{tour.step_count}</span>
                    </span>
                    {currentStepData && (
                        <p className="text-xs text-gray-400 truncate mt-0.5 hidden sm:block">
                            {currentStepData.module_name.replace(/\\/g, "/").split("/").pop() ?? currentStepData.module_name}
                        </p>
                    )}
                </div>
                {step < tour.step_count - 1 ? (
                    <button onClick={() => setStep((s) => s + 1)} className={btnPrimary}>
                        Próximo <Icon name="chevron-right" />
                    </button>
                ) : (
                    <button onClick={() => setTour(null)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Icon name="check" /> Concluir tour
                    </button>
                )}
            </div>
        </div>
    );
}
