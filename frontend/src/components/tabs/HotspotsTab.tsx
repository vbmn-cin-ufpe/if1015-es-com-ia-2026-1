import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getHotspots, type FileHotspot, type HotspotAnalysis } from "../../services/hotspotApi"
import { ThinkingDots, EmptyState, ErrorBanner, Icon } from "../ui"
import { useI18n } from "../../i18n"

interface Props {
    repositoryId: string
    status: string
}

// ── Chart constants ──────────────────────────────────────────────────────────
const CW = 460
const CH = 290
const P = { t: 24, r: 20, b: 46, l: 52 }
const IW = CW - P.l - P.r  // 388
const IH = CH - P.t - P.b  // 220

// ── Risk helpers ─────────────────────────────────────────────────────────────
type RiskInfo = { label: string; dot: string; bg: string; border: string; text: string }

function risk(score: number): RiskInfo {
    if (score >= 75) return { label: "Crítico", dot: "#ef4444", bg: "#fef2f2", border: "#fecaca", text: "#dc2626" }
    if (score >= 50) return { label: "Alto",    dot: "#f97316", bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" }
    if (score >= 25) return { label: "Médio",   dot: "#eab308", bg: "#fefce8", border: "#fde047", text: "#ca8a04" }
    return              { label: "Baixo",   dot: "#22c55e", bg: "#f0fdf4", border: "#86efac", text: "#16a34a" }
}

function medianOf(arr: number[]): number {
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// ── BubbleChart ──────────────────────────────────────────────────────────────

function BubbleChart({
    items, selected, onSelect, thresholdPct, onThresholdChange,
}: {
    items: FileHotspot[]
    selected: string | null
    onSelect: (fp: string) => void
    thresholdPct: number
    onThresholdChange: (v: number) => void
}) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [tooltip, setTooltip] = useState<{ x: number; y: number; item: FileHotspot } | null>(null)
    const [dragging, setDragging] = useState(false)

    useEffect(() => {
        if (!dragging) return
        const up = () => setDragging(false)
        window.addEventListener("mouseup", up)
        return () => window.removeEventListener("mouseup", up)
    }, [dragging])

    if (!items.length) return null

    const maxChurn = Math.max(...items.map(i => i.churn), 1)
    const maxCC    = Math.max(...items.map(i => i.complexity), 1)
    const maxLoc   = Math.max(...items.map(i => i.loc), 1)
    const medChurn = medianOf(items.map(i => i.churn))
    const medCC    = medianOf(items.map(i => i.complexity))

    const qx = P.l + (medChurn / maxChurn) * IW
    const qy = P.t + (1 - medCC / maxCC) * IH
    const tx = P.l + thresholdPct * IW

    const bx = (h: FileHotspot) => P.l + (h.churn / maxChurn) * IW
    const by = (h: FileHotspot) => P.t + (1 - h.complexity / maxCC) * IH
    const br = (h: FileHotspot) => 4 + (h.loc / maxLoc) * 13

    function toSvgX(clientX: number): number {
        if (!svgRef.current) return 0
        const rect = svgRef.current.getBoundingClientRect()
        return ((clientX - rect.left) / rect.width) * CW
    }

    function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
        if (!dragging) return
        const x = toSvgX(e.clientX)
        onThresholdChange(Math.max(0, Math.min(1, (x - P.l) / IW)))
    }

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ y: P.t + (1 - t) * IH, label: Math.round(t * maxCC) }))
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ x: P.l + t * IW,       label: Math.round(t * maxChurn) }))

    return (
        <div className="relative select-none">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${CW} ${CH}`}
                className="w-full"
                style={{ cursor: dragging ? "ew-resize" : "default" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setTooltip(null)}
            >
                {/* Grid lines */}
                {yTicks.map((t, i) => (
                    <line key={`gy${i}`} x1={P.l} y1={t.y} x2={P.l + IW} y2={t.y}
                        stroke="#6b7280" strokeOpacity={0.1} strokeWidth={1} />
                ))}
                {xTicks.map((t, i) => (
                    <line key={`gx${i}`} x1={t.x} y1={P.t} x2={t.x} y2={P.t + IH}
                        stroke="#6b7280" strokeOpacity={0.1} strokeWidth={1} />
                ))}

                {/* Danger zone (top-right of medians) */}
                <rect x={qx} y={P.t} width={P.l + IW - qx} height={qy - P.t}
                    fill="#ef4444" fillOpacity={0.07} rx={3} />
                <text x={(qx + P.l + IW) / 2} y={P.t + 13} textAnchor="middle"
                    fontSize={9} fill="#ef4444" fillOpacity={0.65} fontWeight={600}>
                    ⚠ ZONA DE RISCO
                </text>

                {/* Quadrant dividers */}
                <line x1={qx} y1={P.t} x2={qx} y2={P.t + IH}
                    stroke="#ef4444" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="4,3" />
                <line x1={P.l} y1={qy} x2={P.l + IW} y2={qy}
                    stroke="#ef4444" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="4,3" />

                {/* Below-threshold shade — só mostra quando threshold > 0 */}
                {thresholdPct > 0 && (
                    <rect x={P.l} y={P.t} width={tx - P.l} height={IH}
                        fill="#6366f1" fillOpacity={0.05} />
                )}

                {/* Threshold line — só renderiza quando threshold > 0 */}
                {thresholdPct > 0 && (
                    <line x1={tx} y1={P.t} x2={tx} y2={P.t + IH}
                        stroke="#818cf8" strokeWidth={1.5} strokeDasharray="5,3" />
                )}

                {/* Drag handle — sempre visível para descoberta, mas sutil quando em 0 */}
                <rect x={tx - 9} y={P.t - 9} width={18} height={18} rx={5}
                    fill={thresholdPct > 0 ? "#4f46e5" : "#9ca3af"}
                    fillOpacity={thresholdPct > 0 ? 1 : 0.5}
                    style={{ cursor: "ew-resize" }}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDragging(true) }}
                />
                <text x={tx} y={P.t - 1} textAnchor="middle"
                    fontSize={8} fill="white" fontWeight={700} style={{ pointerEvents: "none" }}>
                    ⟺
                </text>

                {/* Y-axis labels */}
                {yTicks.map((t, i) => (
                    <text key={`ly${i}`} x={P.l - 5} y={t.y + 3.5}
                        textAnchor="end" fontSize={8.5} fill="#9ca3af">{t.label}</text>
                ))}

                {/* X-axis labels */}
                {xTicks.map((t, i) => (
                    <text key={`lx${i}`} x={t.x} y={P.t + IH + 14}
                        textAnchor="middle" fontSize={8.5} fill="#9ca3af">{t.label}</text>
                ))}

                {/* Axis titles */}
                <text x={P.l + IW / 2} y={CH - 3} textAnchor="middle" fontSize={9} fill="#9ca3af">
                    Churn (commits) →
                </text>
                <text x={11} y={P.t + IH / 2} textAnchor="middle" fontSize={9} fill="#9ca3af"
                    transform={`rotate(-90, 11, ${P.t + IH / 2})`}>
                    Complexidade ↑
                </text>

                {/* Bubbles — isFiltered apenas escurece visualmente, não remove da lista */}
                {items.map((h, i) => {
                    const { dot } = risk(h.hotspot_score)
                    const x = bx(h), y = by(h), r = br(h)
                    const isSel      = selected === h.file_path
                    const isFiltered = thresholdPct > 0 && h.churn / maxChurn < thresholdPct

                    return (
                        <motion.g
                            key={h.file_path}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: isFiltered ? 0.2 : 1, scale: 1 }}
                            transition={{ delay: Math.min(i * 0.018, 0.5), type: "spring", damping: 14, stiffness: 200 }}
                            style={{ transformOrigin: `${x}px ${y}px`, cursor: "pointer" }}
                            onClick={() => onSelect(h.file_path)}
                            onMouseEnter={e => {
                                if (!svgRef.current) return
                                const rect = svgRef.current.getBoundingClientRect()
                                setTooltip({
                                    x: ((e.clientX - rect.left) / rect.width) * CW,
                                    y: ((e.clientY - rect.top) / rect.height) * CH,
                                    item: h,
                                })
                            }}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            <circle cx={x} cy={y} r={r}
                                fill={dot}
                                fillOpacity={isFiltered ? 0.25 : isSel ? 1 : 0.72}
                                stroke={isSel ? "#312e81" : dot}
                                strokeWidth={isSel ? 2.5 : 0.8}
                            />
                        </motion.g>
                    )
                })}

                {/* Chart border */}
                <rect x={P.l} y={P.t} width={IW} height={IH}
                    fill="none" stroke="#6b7280" strokeOpacity={0.15} strokeWidth={1} />
            </svg>

            {/* Tooltip */}
            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-30 bg-gray-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-2xl pointer-events-none min-w-[190px]"
                        style={{
                            left: `${(tooltip.x / CW) * 100}%`,
                            top: `${(tooltip.y / CH) * 100}%`,
                            transform: tooltip.x > CW * 0.62
                                ? "translate(-108%, -50%)"
                                : "translate(12px, -50%)",
                        }}
                    >
                        <p className="font-mono font-bold text-[11px] truncate max-w-[200px] mb-0.5">
                            {tooltip.item.file_path.split("/").pop()}
                        </p>
                        <p className="text-gray-400 font-mono text-[9px] truncate max-w-[200px] mb-2">
                            {tooltip.item.file_path}
                        </p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px]">
                            <span className="text-gray-400">Score</span>
                            <span style={{ color: risk(tooltip.item.hotspot_score).dot }} className="font-bold">
                                {tooltip.item.hotspot_score.toFixed(0)}% · {risk(tooltip.item.hotspot_score).label}
                            </span>
                            <span className="text-gray-400">Commits</span>
                            <span>{tooltip.item.churn}</span>
                            <span className="text-gray-400">Complexidade</span>
                            <span>{tooltip.item.complexity.toFixed(1)}</span>
                            <span className="text-gray-400">Linhas</span>
                            <span>{tooltip.item.loc}</span>
                            <span className="text-gray-400">Linguagem</span>
                            <span className="font-mono">.{tooltip.item.language}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend + drag hint */}
            <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-gray-500 dark:text-gray-400">
                {[
                    { dot: "#ef4444", l: "Crítico ≥75" },
                    { dot: "#f97316", l: "Alto 50–74" },
                    { dot: "#eab308", l: "Médio 25–49" },
                    { dot: "#22c55e", l: "Baixo <25" },
                ].map(({ dot, l }) => (
                    <span key={l} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                        {l}
                    </span>
                ))}
                <span className="ml-auto text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                    <Icon name="left-right" className="text-[9px]" />
                    Arraste ⟺ para filtrar por churn
                </span>
            </div>
        </div>
    )
}

// ── FileRow ───────────────────────────────────────────────────────────────────

function FileRow({
    h, idx, maxChurn, maxCC, isSelected, onClick,
}: {
    h: FileHotspot
    idx: number
    maxChurn: number
    maxCC: number
    isSelected: boolean
    onClick: () => void
}) {
    const { label, dot, bg, border, text } = risk(h.hotspot_score)
    const fileName = h.file_path.split("/").pop() ?? h.file_path

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx * 0.022, 0.4), duration: 0.18 }}
            onClick={onClick}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                isSelected
                    ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/30 border border-transparent"
            }`}
        >
            {/* Rank badge */}
            <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{ background: dot + "22", color: dot }}
            >
                {idx + 1}
            </span>

            <div className="flex-1 min-w-0">
                {/* Filename + language */}
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {fileName}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase font-mono">
                        {h.language}
                    </span>
                </div>

                {/* Metric bars */}
                <div className="space-y-0.5">
                    {[
                        { label: "Churn", value: h.churn,      max: maxChurn, color: "#6366f1", fmt: (v: number) => String(v) },
                        { label: "CC",    value: h.complexity, max: maxCC,    color: "#f59e0b", fmt: (v: number) => v.toFixed(1) },
                    ].map(({ label: bl, value, max, color, fmt }) => (
                        <div key={bl} className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400 w-6 shrink-0">{bl}</span>
                            <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(value / max) * 100}%` }}
                                    transition={{ delay: Math.min(idx * 0.022 + 0.1, 0.5), duration: 0.5, ease: "easeOut" }}
                                    className="h-full rounded-full"
                                    style={{ background: color }}
                                />
                            </div>
                            <span className="text-[9px] text-gray-400 w-7 text-right shrink-0 tabular-nums">
                                {fmt(value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Score + risk badge */}
            <div className="shrink-0 flex flex-col items-end gap-0.5">
                <span className="text-sm font-bold tabular-nums" style={{ color: dot }}>
                    {h.hotspot_score.toFixed(0)}
                </span>
                <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                    style={{ background: bg, color: text, borderColor: border }}
                >
                    {label}
                </span>
            </div>
        </motion.div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export function HotspotsTab({ repositoryId, status }: Props) {
    const { t } = useI18n()
    const [topN, setTopN] = useState(30)
    const [churnMonths, setChurnMonths] = useState(6)
    const [analysis, setAnalysis] = useState<HotspotAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<string | null>(null)
    const [filterLang, setFilterLang] = useState("")
    const [filterRisk, setFilterRisk] = useState(0)
    const [thresholdPct, setThresholdPct] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    // Auto-load on mount / repo change
    useEffect(() => {
        if (status === "completed") runAnalysis()
    }, [repositoryId, status]) // eslint-disable-line react-hooks/exhaustive-deps

    async function runAnalysis() {
        setLoading(true)
        setError(null)
        try {
            const res = await getHotspots(repositoryId, topN, churnMonths)
            setAnalysis(res)
            setSelected(null)
            setThresholdPct(0)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Erro ao carregar hotspots")
        } finally {
            setLoading(false)
        }
    }

    function handleSelect(fp: string) {
        setSelected(prev => prev === fp ? null : fp)
        setTimeout(() => {
            const all = listRef.current?.querySelectorAll("[data-fp]") ?? []
            const el = Array.from(all).find(el => el.getAttribute("data-fp") === fp) as HTMLElement | null
            el?.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 60)
    }

    if (status !== "completed") {
        return (
            <EmptyState
                icon="fire"
                title="Repositório não indexado"
                description="Indexe o repositório primeiro para analisar hotspots."
            />
        )
    }

    const hotspots  = analysis?.hotspots ?? []
    const maxChurn  = Math.max(...hotspots.map(h => h.churn), 1)
    const maxCC     = Math.max(...hotspots.map(h => h.complexity), 1)
    const languages = [...new Set(hotspots.map(h => h.language))].sort()

    // threshold só afeta visualmente o gráfico — não filtra a lista
    const filtered = hotspots.filter(h => {
        if (filterLang && h.language !== filterLang) return false
        if (h.hotspot_score < filterRisk) return false
        return true
    })

    const counts = {
        total:    hotspots.length,
        critical: hotspots.filter(h => h.hotspot_score >= 75).length,
        high:     hotspots.filter(h => h.hotspot_score >= 50 && h.hotspot_score < 75).length,
    }

    const hasFilters = !!(filterLang || filterRisk > 0)

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 p-5 text-white shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                            <Icon name="fire" className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Mapa de Hotspots</h2>
                            <p className="text-orange-100 text-xs mt-0.5">
                                Alta frequência de mudanças × Alta complexidade = Risco técnico real
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                        <select
                            value={topN}
                            onChange={e => setTopN(Number(e.target.value))}
                            className="text-xs rounded-lg bg-white/20 border border-white/30 text-white px-2.5 py-1.5 backdrop-blur-sm"
                        >
                            {[10, 20, 30, 50].map(n => (
                                <option key={n} value={n} className="text-gray-900 bg-white">Top {n}</option>
                            ))}
                        </select>
                        <select
                            value={churnMonths}
                            onChange={e => setChurnMonths(Number(e.target.value))}
                            className="text-xs rounded-lg bg-white/20 border border-white/30 text-white px-2.5 py-1.5 backdrop-blur-sm"
                        >
                            {[3, 6, 12].map(m => (
                                <option key={m} value={m} className="text-gray-900 bg-white">{m} meses</option>
                            ))}
                        </select>
                        <button
                            onClick={runAnalysis}
                            disabled={loading}
                            className="text-xs px-3.5 py-1.5 rounded-lg bg-white text-orange-600 font-bold hover:bg-orange-50 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                        >
                            <Icon name="rotate" className={loading ? "animate-spin" : ""} />
                            {loading ? "Analisando…" : "Atualizar"}
                        </button>
                    </div>
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {loading && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-16 flex justify-center">
                    <ThinkingDots label="Analisando churn e complexidade do código…" />
                </div>
            )}

            <AnimatePresence>
                {!loading && analysis && (
                    <motion.div
                        key="hotspot-results"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className="space-y-4"
                    >
                        {/* ── Stats row — sempre sobre os dados globais (sem filtro) para dar contexto real ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { v: analysis.total_files_scanned, l: "Arquivos escaneados", c: "text-gray-700 dark:text-gray-200" },
                                { v: counts.total,    l: `Top ${topN} hotspots`,   c: "text-gray-700 dark:text-gray-200" },
                                { v: counts.critical, l: "Críticos (≥75)", c: "text-red-600 dark:text-red-400" },
                                { v: counts.high,     l: "Alto risco (50-74)", c: "text-orange-600 dark:text-orange-400" },
                            ].map((s, i) => (
                                <div key={s.l} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
                                    <motion.p
                                        className={`text-2xl font-bold tabular-nums ${s.c}`}
                                        initial={{ scale: 0.4, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: i * 0.07, type: "spring", damping: 10 }}
                                    >
                                        {s.v}
                                    </motion.p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{s.l}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── Filters ── */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-gray-400 font-medium shrink-0">Linguagem:</span>
                            {["", ...languages].map(l => (
                                <button
                                    key={l || "_all"}
                                    onClick={() => setFilterLang(l)}
                                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono ${
                                        filterLang === l
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                                    }`}
                                >
                                    {l ? `.${l}` : "Todas"}
                                </button>
                            ))}
                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                            <span className="text-xs text-gray-400 font-medium shrink-0">Risco mín.:</span>
                            {[
                                { v: 0, l: "Todos" },
                                { v: 25, l: "≥ Médio" },
                                { v: 50, l: "≥ Alto" },
                                { v: 75, l: "Crítico" },
                            ].map(r => (
                                <button
                                    key={r.v}
                                    onClick={() => setFilterRisk(r.v)}
                                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                        filterRisk === r.v
                                            ? "bg-orange-500 text-white border-orange-500"
                                            : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                                    }`}
                                >
                                    {r.l}
                                </button>
                            ))}
                            {hasFilters && (
                                <>
                                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                                    <button
                                        onClick={() => { setFilterLang(""); setFilterRisk(0); setThresholdPct(0) }}
                                        className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1 transition-colors"
                                    >
                                        <Icon name="xmark" className="text-[10px]" /> Limpar
                                    </button>
                                    <span className="text-xs text-indigo-500 dark:text-indigo-400">
                                        {filtered.length}/{hotspots.length} arquivos
                                    </span>
                                </>
                            )}
                        </div>

                        {/* ── Chart + Ranking ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
                            {/* Bubble chart — recebe filtered para ficar sincronizado com filtros */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon name="crosshairs" className="text-orange-500" />
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        Churn × Complexidade
                                    </h3>
                                    <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">
                                        tamanho = LOC · arraste ⟺ ou clique para selecionar
                                    </span>
                                </div>
                                <BubbleChart
                                    items={filtered}
                                    selected={selected}
                                    onSelect={handleSelect}
                                    thresholdPct={thresholdPct}
                                    onThresholdChange={setThresholdPct}
                                />
                            </div>

                            {/* Ranked list */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon name="list" className="text-orange-500" />
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        Ranking de Risco
                                    </h3>
                                    <span className="ml-auto text-[10px] text-gray-400">
                                        {filtered.length} arquivo{filtered.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <div ref={listRef} className="space-y-0.5 max-h-[380px] overflow-y-auto pr-0.5">
                                    {filtered.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Icon name="circle-check" className="text-2xl text-green-400 mb-2 block" />
                                            <p className="text-sm text-gray-400">Nenhum arquivo com os filtros atuais</p>
                                        </div>
                                    ) : (
                                        filtered.map((h, i) => (
                                            <div key={h.file_path} data-fp={h.file_path}>
                                                <FileRow
                                                    h={h}
                                                    idx={i}
                                                    maxChurn={maxChurn}
                                                    maxCC={maxCC}
                                                    isSelected={selected === h.file_path}
                                                    onClick={() => handleSelect(h.file_path)}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
