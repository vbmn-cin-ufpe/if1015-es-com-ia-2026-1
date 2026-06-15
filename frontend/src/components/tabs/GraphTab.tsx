import { useState, useEffect, useRef, useCallback } from "react";
import {
    getDependencyGraph,
    getModuleDetails,
    type GraphPayload,
    type GraphNode,
    type ModuleDetails,
} from "../../services/graphApi";
import {
    Card,
    ThinkingDots,
    EmptyState,
    ErrorBanner,
    Icon,
    btnSecondary,
    inputCls,
} from "../ui";

interface Props {
    repositoryId: string;
    status: string;
}

// ── Node with physics state ──────────────────────────────────────────────────
type NodePos = GraphNode & { x: number; y: number; vx: number; vy: number };

// ── Constants ────────────────────────────────────────────────────────────────
const BOX_W = 176;
const BOX_H = 56;
const FORCE_ITERS = 500;
const REPULSE = 260000;
const ATTRACT = 0.0025;
const DAMPING = 0.72;
const GRAVITY = 0.0015;

// ── Force-directed layout ────────────────────────────────────────────────────
function forceLayout(
    nodes: GraphNode[],
    edges: { source: string; target: string }[],
): NodePos[] {
    const n = nodes.length;
    if (n === 0) return [];

    // Use a larger canvas and grid-based initial placement to avoid overlap
    const cols = Math.ceil(Math.sqrt(n * 1.6));
    const cellW = Math.max(BOX_W + 440, 640);
    const cellH = Math.max(BOX_H + 380, 460);
    const CANVAS = Math.max(2400, cols * cellW + 500);
    const cx = CANVAS / 2;
    const cy = CANVAS / 2;

    // Sort by degree descending so hubs start near center
    const sorted = [...nodes].sort(
        (a, b) => b.metrics.total_degree - a.metrics.total_degree,
    );

    const pos: NodePos[] = sorted.map((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const rows = Math.ceil(n / cols);
        const gridW = cols * cellW;
        const gridH = rows * cellH;
        const jitter = (Math.random() - 0.5) * 40;
        return {
            ...node,
            x: cx - gridW / 2 + col * cellW + cellW / 2 + jitter,
            y: cy - gridH / 2 + row * cellH + cellH / 2 + jitter,
            vx: 0,
            vy: 0,
        };
    });

    const byId = new Map(pos.map((p) => [p.id, p]));

    for (let iter = 0; iter < FORCE_ITERS; iter++) {
        const cool = Math.pow(1 - iter / FORCE_ITERS, 1.5);

        // Repulsion
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = pos[i], b = pos[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;
                const d = Math.sqrt(d2) || 0.1;
                // Stronger repulsion when very close
                const f = (REPULSE / d2) * cool * (d < BOX_W * 2 ? 4 : 1);
                const fx = (dx / d) * f, fy = (dy / d) * f;
                a.vx -= fx; a.vy -= fy;
                b.vx += fx; b.vy += fy;
            }
        }

        // Attraction along edges
        for (const e of edges) {
            const s = byId.get(e.source), t = byId.get(e.target);
            if (!s || !t) continue;
            const dx = t.x - s.x, dy = t.y - s.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 0.1;
            const f = d * ATTRACT * cool;
            const fx = (dx / d) * f, fy = (dy / d) * f;
            s.vx += fx; s.vy += fy;
            t.vx -= fx; t.vy -= fy;
        }

        // Gravity toward center
        for (const p of pos) {
            p.vx += (cx - p.x) * GRAVITY;
            p.vy += (cy - p.y) * GRAVITY;
            p.vx *= DAMPING;
            p.vy *= DAMPING;
            p.x += p.vx;
            p.y += p.vy;
            p.x = Math.max(BOX_W / 2 + 20, Math.min(CANVAS - BOX_W / 2 - 20, p.x));
            p.y = Math.max(BOX_H / 2 + 20, Math.min(CANVAS - BOX_H / 2 - 20, p.y));
        }
    }

    // Shift to origin with padding
    const minX = Math.min(...pos.map((p) => p.x)) - BOX_W / 2;
    const minY = Math.min(...pos.map((p) => p.y)) - BOX_H / 2;
    for (const p of pos) {
        p.x -= minX - 48;
        p.y -= minY - 48;
    }
    return pos;
}

// ── Node colors (dark-mode aware, inline styles for SVG) ─────────────────────
function nclr(inDeg: number, maxDeg: number, dark: boolean) {
    const r = maxDeg > 0 ? inDeg / maxDeg : 0;
    if (dark) {
        if (r > 0.6)
            return {
                bg: "#4c0519",
                border: "#f43f5e",
                text: "#fda4af",
                badge: "#881337",
            };
        if (r > 0.3)
            return {
                bg: "#431407",
                border: "#f97316",
                text: "#fdba74",
                badge: "#7c2d12",
            };
        return {
            bg: "#052e16",
            border: "#22c55e",
            text: "#86efac",
            badge: "#14532d",
        };
    }
    if (r > 0.6)
        return {
            bg: "#fff1f2",
            border: "#f43f5e",
            text: "#be123c",
            badge: "#fce7f3",
        };
    if (r > 0.3)
        return {
            bg: "#fff7ed",
            border: "#f97316",
            text: "#c2410c",
            badge: "#ffedd5",
        };
    return {
        bg: "#f0fdf4",
        border: "#22c55e",
        text: "#15803d",
        badge: "#dcfce7",
    };
}

// ── Main component ───────────────────────────────────────────────────────────
export function GraphTab({ repositoryId, status }: Props) {
    const [graph, setGraph] = useState<GraphPayload | null>(null);
    const [positions, setPositions] = useState<NodePos[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<ModuleDetails | null>(null);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [error, setError] = useState("");
    const [dark, setDark] = useState(false);
    const [tooltip, setTooltip] = useState<{
        text: string;
        x: number;
        y: number;
    } | null>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const isPanning = useRef(false);
    const didDrag = useRef(false);
    const panOrigin = useRef({ x: 0, y: 0 });

    // Detect dark mode from <html class>
    useEffect(() => {
        const check = () =>
            setDark(document.documentElement.classList.contains("dark"));
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (status !== "completed") return;
        loadGraph();
    }, [repositoryId, status]);

    async function loadGraph() {
        setError("");
        setLoading(true);
        setSelectedId(null);
        setDetail(null);
        try {
            const g = await getDependencyGraph(repositoryId);
            setGraph(g);
            setPositions(forceLayout(g.nodes, g.edges));
            setPan({ x: 0, y: 0 });
            setZoom(1);
        } catch {
            setError("Não foi possível carregar o grafo de dependências.");
        } finally {
            setLoading(false);
        }
    }

    const handleNodeClick = useCallback(
        async (node: NodePos) => {
            if (selectedId === node.id) {
                setSelectedId(null);
                setDetail(null);
                return;
            }
            setSelectedId(node.id);
            setLoadingDetail(true);
            try {
                setDetail(
                    await getModuleDetails(repositoryId, node.module_path),
                );
            } catch {
                setDetail(null);
            } finally {
                setLoadingDetail(false);
            }
        },
        [selectedId, repositoryId],
    );

    // ── Zoom / pan handlers ──────────────────────────────────────────────────
    function onWheel(e: React.WheelEvent) {
        e.preventDefault();
        setZoom((z) =>
            Math.min(5, Math.max(0.15, z * (e.deltaY > 0 ? 0.88 : 1.14))),
        );
    }
    function onMouseDown(e: React.MouseEvent) {
        if (e.button !== 0) return;
        isPanning.current = true;
        didDrag.current = false;
        panOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
    function onMouseMove(e: React.MouseEvent) {
        if (!isPanning.current) return;
        didDrag.current = true;
        setPan({
            x: e.clientX - panOrigin.current.x,
            y: e.clientY - panOrigin.current.y,
        });
    }
    function onMouseUp() {
        isPanning.current = false;
    }

    // ── Guards ───────────────────────────────────────────────────────────────
    if (status !== "completed")
        return (
            <Card>
                <EmptyState icon="🔗" title="Indexe um repositório primeiro" />
            </Card>
        );

    if (loading)
        return (
            <Card>
                <div className="py-12 flex justify-center">
                    <ThinkingDots label="Calculando grafo de dependências…" />
                </div>
            </Card>
        );

    if (!graph || positions.length === 0)
        return (
            <Card>
                <EmptyState
                    icon="🔗"
                    title="Grafo não disponível"
                    description="Verifique se o repositório possui arquivos suportados."
                />
                <button onClick={loadGraph} className={`mt-4 ${btnSecondary}`}>
                    ↻ Tentar novamente
                </button>
            </Card>
        );

    // ── Derived state ────────────────────────────────────────────────────────
    const maxDeg = Math.max(...graph.nodes.map((n) => n.metrics.in_degree), 1);
    const posMap = new Map(positions.map((n) => [n.id, n]));
    const outOf = new Set<string>(); // nodes this → points to
    const intoOf = new Set<string>(); // nodes that → point to this
    if (selectedId) {
        for (const e of graph.edges) {
            if (e.source === selectedId) outOf.add(e.target);
            if (e.target === selectedId) intoOf.add(e.source);
        }
    }
    const filterSet = filter
        ? new Set(
              positions
                  .filter(
                      (n) =>
                          n.label
                              .toLowerCase()
                              .includes(filter.toLowerCase()) ||
                          n.module_path
                              .toLowerCase()
                              .includes(filter.toLowerCase()),
                  )
                  .map((n) => n.id),
          )
        : null;

    const viewW = Math.max(...positions.map((n) => n.x + BOX_W / 2 + 48), 640);
    const viewH = Math.max(...positions.map((n) => n.y + BOX_H / 2 + 48), 480);

    const edgeDefault = dark ? "#4f46e5" : "#a5b4fc";
    const edgeActive = "#f97316";
    const canvasBg = dark ? "#111827" : "#f8fafc";
    const tooltipBg = dark ? "#1e293b" : "#1e293b";

    return (
        <div className="space-y-4">
            {error && (
                <ErrorBanner message={error} onClose={() => setError("")} />
            )}

            {/* Controls bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex gap-3 items-center flex-wrap">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Icon name="magnifying-glass" className="text-xs" />
                        </span>
                        <input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filtrar módulos…"
                            className={`${inputCls} max-w-xs pl-8`}
                        />
                    </div>
                    <button onClick={loadGraph} className={btnSecondary} title="Recarregar grafo">
                        <Icon name="arrows-rotate" /> Recarregar
                    </button>
                    <button
                        onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
                        className={btnSecondary}
                        title="Centralizar visão"
                    >
                        <Icon name="crosshairs" /> Centralizar
                    </button>
                    <button
                        onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0.5); }}
                        className={btnSecondary}
                        title="Visão geral (zoom out)"
                    >
                        <Icon name="maximize" /> Visão geral
                    </button>
                    <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                        <Icon name="scroll" className="mr-1" />zoom ·
                        <Icon name="hand" className="mx-1" />mover ·
                        <Icon name="arrow-pointer" className="mx-1" />detalhes
                    </span>
                    <div className="flex gap-3 ml-auto text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm border-2 border-rose-500 bg-rose-50 dark:bg-rose-950" />
                            <Icon name="star" className="text-rose-400 text-xs" /> Hub (&gt;60%)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm border-2 border-orange-400 bg-orange-50 dark:bg-orange-950" />
                            <Icon name="circle-half-stroke" className="text-orange-400 text-xs" /> Intermediário
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm border-2 border-green-500 bg-green-50 dark:bg-green-950" />
                            <Icon name="leaf" className="text-green-500 text-xs" /> Folha
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                {/* ── Canvas ──────────────────────────────────────────────────────── */}
                <div
                    className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 relative select-none"
                    style={{
                        maxHeight: "72vh",
                        background: canvasBg,
                        cursor: isPanning.current ? "grabbing" : "grab",
                    }}
                    onWheel={onWheel}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                >
                    <svg
                        viewBox={`0 0 ${viewW} ${viewH}`}
                        width="100%"
                        height="100%"
                        style={{ minWidth: 400, minHeight: 400 }}
                    >
                        <defs>
                            <filter id="cc-shadow">
                                <feDropShadow
                                    dx="0"
                                    dy="2"
                                    stdDeviation="3"
                                    floodOpacity="0.18"
                                />
                            </filter>
                            <filter id="cc-glow">
                                <feGaussianBlur
                                    stdDeviation="5"
                                    result="blur"
                                />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <marker
                                id="cc-arr"
                                markerWidth="8"
                                markerHeight="8"
                                refX="7"
                                refY="3"
                                orient="auto"
                            >
                                <path d="M0,0 L8,3 L0,6 Z" fill={edgeDefault} />
                            </marker>
                            <marker
                                id="cc-arr-active"
                                markerWidth="8"
                                markerHeight="8"
                                refX="7"
                                refY="3"
                                orient="auto"
                            >
                                <path d="M0,0 L8,3 L0,6 Z" fill={edgeActive} />
                            </marker>
                            <marker
                                id="cc-arr-into"
                                markerWidth="8"
                                markerHeight="8"
                                refX="7"
                                refY="3"
                                orient="auto"
                            >
                                <path d="M0,0 L8,3 L0,6 Z" fill="#818cf8" />
                            </marker>
                        </defs>

                        <g
                            transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}
                        >
                            {/* ── Edges ─────────────────────────────────────────────────── */}
                            {graph.edges.map((edge) => {
                                const s = posMap.get(edge.source),
                                    t = posMap.get(edge.target);
                                if (!s || !t) return null;

                                const isOut = selectedId
                                    ? edge.source === selectedId
                                    : false;
                                const isIn = selectedId
                                    ? edge.target === selectedId
                                    : false;
                                const isActive = isOut || isIn;
                                const isDimmed = selectedId ? !isActive : false;
                                const isFiltered = filterSet
                                    ? !filterSet.has(edge.source) &&
                                      !filterSet.has(edge.target)
                                    : false;
                                if (isDimmed || isFiltered) return null;

                                const x1 = s.x,
                                    y1 = s.y + BOX_H / 2 + 2;
                                const x2 = t.x,
                                    y2 = t.y - BOX_H / 2 - 6;
                                const my = (y1 + y2) / 2;
                                const stroke = isOut
                                    ? edgeActive
                                    : isIn
                                      ? "#818cf8"
                                      : edgeDefault;
                                const marker = isOut
                                    ? "url(#cc-arr-active)"
                                    : isIn
                                      ? "url(#cc-arr-into)"
                                      : "url(#cc-arr)";

                                return (
                                    <path
                                        key={edge.id}
                                        d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
                                        fill="none"
                                        stroke={stroke}
                                        strokeWidth={isActive ? 2.2 : 1}
                                        strokeDasharray={
                                            isActive ? undefined : "5 4"
                                        }
                                        opacity={isActive ? 0.95 : 0.35}
                                        markerEnd={marker}
                                    />
                                );
                            })}

                            {/* ── Nodes ─────────────────────────────────────────────────── */}
                            {positions.map((node) => {
                                const c = nclr(
                                    node.metrics.in_degree,
                                    maxDeg,
                                    dark,
                                );
                                const isSel = node.id === selectedId;
                                const isNeighbor =
                                    outOf.has(node.id) || intoOf.has(node.id);
                                const isDimmed =
                                    (selectedId && !isSel && !isNeighbor) ||
                                    (filterSet
                                        ? !filterSet.has(node.id)
                                        : false);

                                const label =
                                    node.label.length > 19
                                        ? node.label.slice(0, 17) + "…"
                                        : node.label;
                                const parts = node.module_path.split("/");
                                const subpath =
                                    parts.length > 2
                                        ? `…/${parts.slice(-2).join("/")}`
                                        : node.module_path;
                                const subLabel =
                                    subpath.length > 25
                                        ? subpath.slice(0, 23) + "…"
                                        : subpath;

                                const bx = node.x - BOX_W / 2;
                                const by = node.y - BOX_H / 2;

                                // Neighbor direction hint color
                                const borderColor = isSel
                                    ? "#f97316"
                                    : isNeighbor && outOf.has(node.id)
                                      ? "#f97316"
                                      : isNeighbor && intoOf.has(node.id)
                                        ? "#818cf8"
                                        : c.border;
                                const strokeW = isSel
                                    ? 2.5
                                    : isNeighbor && selectedId
                                      ? 2
                                      : 1.5;

                                return (
                                    <g
                                        key={node.id}
                                        opacity={isDimmed ? 0.12 : 1}
                                        style={{ cursor: "pointer" }}
                                        filter={
                                            isSel
                                                ? "url(#cc-glow)"
                                                : "url(#cc-shadow)"
                                        }
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!didDrag.current)
                                                handleNodeClick(node);
                                        }}
                                        onMouseEnter={() =>
                                            setTooltip({
                                                text: node.module_path,
                                                x: node.x,
                                                y: by - 8,
                                            })
                                        }
                                        onMouseLeave={() => setTooltip(null)}
                                    >
                                        {/* Main box */}
                                        <rect
                                            x={bx}
                                            y={by}
                                            width={BOX_W}
                                            height={BOX_H}
                                            rx={9}
                                            fill={c.bg}
                                            stroke={borderColor}
                                            strokeWidth={strokeW}
                                        />

                                        {/* Left color strip */}
                                        <rect
                                            x={bx}
                                            y={by}
                                            width={5}
                                            height={BOX_H}
                                            rx={4}
                                            fill={c.border}
                                            opacity={0.85}
                                        />

                                        {/* Module name */}
                                        <text
                                            x={bx + 16}
                                            y={by + 20}
                                            fontSize={12}
                                            fontWeight="700"
                                            fill={c.text}
                                            fontFamily="ui-monospace, 'Cascadia Code', 'Fira Code', monospace"
                                        >
                                            {label}
                                        </text>

                                        {/* Sub-path */}
                                        <text
                                            x={bx + 16}
                                            y={by + 34}
                                            fontSize={9}
                                            fill={c.text}
                                            opacity={0.5}
                                            fontFamily="ui-monospace, monospace"
                                        >
                                            {subLabel}
                                        </text>

                                        {/* in_degree badge */}
                                        <rect
                                            x={bx + BOX_W - 32}
                                            y={by + 6}
                                            width={26}
                                            height={15}
                                            rx={5}
                                            fill={c.badge}
                                        />
                                        <text
                                            x={bx + BOX_W - 19}
                                            y={by + 16.5}
                                            fontSize={8.5}
                                            fontWeight="700"
                                            textAnchor="middle"
                                            fill={c.text}
                                            fontFamily="system-ui, sans-serif"
                                        >
                                            ↙{node.metrics.in_degree}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* ── Tooltip ───────────────────────────────────────────────── */}
                            {tooltip && (
                                <g pointerEvents="none">
                                    <rect
                                        x={tooltip.x - 6}
                                        y={tooltip.y - 18}
                                        width={Math.min(
                                            tooltip.text.length * 6.8 + 12,
                                            340,
                                        )}
                                        height={22}
                                        rx={5}
                                        fill={tooltipBg}
                                        opacity={0.92}
                                    />
                                    <text
                                        x={tooltip.x}
                                        y={tooltip.y - 3}
                                        fontSize={10}
                                        fill="#e2e8f0"
                                        fontFamily="ui-monospace, monospace"
                                    >
                                        {tooltip.text.length > 48
                                            ? tooltip.text.slice(0, 46) + "…"
                                            : tooltip.text}
                                    </text>
                                </g>
                            )}
                        </g>
                    </svg>

                    {/* Zoom badge */}
                    <div className="absolute bottom-3 right-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs font-mono text-gray-500 dark:text-gray-400 shadow-sm pointer-events-none">
                        {Math.round(zoom * 100)}%
                    </div>

                    {/* Selected hint */}
                    {selectedId && (
                        <div className="absolute top-3 left-3 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-1.5 text-xs text-orange-700 dark:text-orange-300 shadow-sm">
                            <Icon name="arrow-pointer" className="mr-1" />
                            <strong>{outOf.size + intoOf.size}</strong>{" "}
                            conexão{outOf.size + intoOf.size !== 1 ? "ões" : ""}{" "}
                            diretas &nbsp;·&nbsp;
                            <span className="opacity-60">
                                <Icon name="arrow-up-right-from-square" className="mr-0.5" />{outOf.size} saída
                                 · 
                                <Icon name="arrow-down-left" className="mr-0.5" />{intoOf.size} entrada
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Detail panel ────────────────────────────────────────────────── */}
                {(detail || loadingDetail || selectedId) && (
                    <div className="w-72 shrink-0 space-y-3">
                        {loadingDetail && (
                            <Card>
                                <ThinkingDots label="Carregando detalhes…" />
                            </Card>
                        )}

                        {detail && !loadingDetail && (
                            <>
                                <Card>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
                                                {detail.label}
                                            </h3>
                                            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5 break-all leading-relaxed">
                                                {detail.module_path}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedId(null); setDetail(null); }}
                                            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none shrink-0"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    {/* Degree metrics */}
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 rounded-lg p-2.5">
                                            <p className="font-bold text-rose-700 dark:text-rose-300 text-lg leading-tight">
                                                {detail.metrics.in_degree}
                                            </p>
                                            <p className="text-rose-500 dark:text-rose-400 mt-0.5">↙ Entrada</p>
                                        </div>
                                        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-lg p-2.5">
                                            <p className="font-bold text-indigo-700 dark:text-indigo-300 text-lg leading-tight">
                                                {detail.metrics.out_degree}
                                            </p>
                                            <p className="text-indigo-500 dark:text-indigo-400 mt-0.5">↗ Saída</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg p-2.5">
                                            <p className="font-bold text-gray-700 dark:text-gray-300 text-lg leading-tight">
                                                {detail.metrics.total_degree}
                                            </p>
                                            <p className="text-gray-500 dark:text-gray-400 mt-0.5">Total</p>
                                        </div>
                                    </div>
                                    {/* Centrality bar */}
                                    {maxDeg > 0 && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span className="flex items-center gap-1">
                                                    <Icon name="star" className="text-yellow-400" /> Centralidade (in-degree)
                                                </span>
                                                <span>{Math.round((detail.metrics.in_degree / maxDeg) * 100)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-green-400 via-orange-400 to-rose-500"
                                                    style={{ width: `${Math.round((detail.metrics.in_degree / maxDeg) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Card>

                                {detail.inbound_dependencies.length > 0 && (
                                    <Card title="">
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                                            <Icon name="arrow-down-to-bracket" className="text-indigo-400" />
                                            Quem usa este módulo
                                            <span className="ml-auto text-gray-400 font-normal">{detail.inbound_dependencies.length}</span>
                                        </p>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {detail.inbound_dependencies.map((d, i) => (
                                                <p key={i} className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-2 py-1.5 rounded-md">
                                                    {d.source.split("/").pop() ?? d.source}
                                                    <span className="opacity-40 block text-gray-400 text-xs truncate">{d.source}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {detail.outbound_dependencies.length > 0 && (
                                    <Card title="">
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                                            <Icon name="arrow-up-from-bracket" className="text-orange-400" />
                                            Módulos que este usa
                                            <span className="ml-auto text-gray-400 font-normal">{detail.outbound_dependencies.length}</span>
                                        </p>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {detail.outbound_dependencies.map((d, i) => (
                                                <p key={i} className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 px-2 py-1.5 rounded-md">
                                                    {d.target.split("/").pop() ?? d.target}
                                                    <span className="opacity-40 block text-gray-400 text-xs truncate">{d.target}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer stats */}
            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400 px-1">
                <span className="flex items-center gap-1.5">
                    <Icon name="cubes" className="text-indigo-400" />
                    <strong className="text-gray-700 dark:text-gray-300">
                        {graph.node_count}
                    </strong>{" "}
                    módulos
                </span>
                <span className="flex items-center gap-1.5">
                    <Icon name="arrow-right-arrow-left" className="text-indigo-400" />
                    <strong className="text-gray-700 dark:text-gray-300">
                        {graph.edge_count}
                    </strong>{" "}
                    dependências
                </span>
                {filterSet && (
                    <span className="flex items-center gap-1.5">
                        <Icon name="magnifying-glass" className="text-indigo-400" />
                        <strong className="text-gray-700 dark:text-gray-300">
                            {filterSet.size}
                        </strong>{" "}
                        correspondências
                    </span>
                )}
            </div>
        </div>
    );
}
