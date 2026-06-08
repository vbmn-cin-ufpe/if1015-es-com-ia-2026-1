import { useState, useEffect } from "react"
import {
  getReadiness,
  getOperationalSummary,
  type DependencyStatus,
  type ReadinessResponse,
  type OperationalSummary,
} from "../../services/opsApi"
import { Card, Badge, ThinkingDots, ErrorBanner, btnSecondary } from "../ui"

function statusDot(s: string) {
  const map: Record<string, string> = {
    ok: "bg-green-500", healthy: "bg-green-500",
    warning: "bg-yellow-400",
    error: "bg-red-500", fail: "bg-red-500", down: "bg-red-500",
  }
  return map[s.toLowerCase()] ?? "bg-gray-400"
}

function LatencyBadge({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-xs text-gray-400">—</span>
  const color = ms < 100 ? "text-green-600 bg-green-50" : ms < 500 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
  return <span className={`text-xs font-mono px-2 py-0.5 rounded ${color}`}>{ms.toFixed(0)}ms</span>
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
        <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 shrink-0 w-8 text-right">{value}</span>
    </div>
  )
}

export function OpsTab() {
  const [readiness, setReadiness]   = useState<ReadinessResponse | null>(null)
  const [summary, setSummary]       = useState<OperationalSummary | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setError("")
    setLoading(true)
    try {
      const [r, s] = await Promise.all([getReadiness(), getOperationalSummary()])
      setReadiness(r)
      setSummary(s)
    } catch {
      setError("Não foi possível carregar informações operacionais.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Card><div className="py-10 flex justify-center"><ThinkingDots label="Verificando dependências…" /></div></Card>
  }

  const maxReqs = summary
    ? Math.max(...Object.values(summary.operations).map(o => o.request_count), 1)
    : 1

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      {/* System health */}
      {readiness && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Status do Sistema</h2>
            <div className="flex items-center gap-3">
              <Badge status={readiness.status} />
              <button onClick={load} className={btnSecondary}>↻ Atualizar</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {readiness.dependencies.map((dep: DependencyStatus) => (
              <div key={dep.name} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${statusDot(dep.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{dep.name}</p>
                  <p className="text-xs text-gray-500 truncate">{dep.message}</p>
                </div>
                <LatencyBadge ms={dep.latency_ms} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Operational summary */}
      {summary && (
        <>
          <Card title="Resumo Operacional">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-3 text-center">
                <p className="text-lg font-bold text-indigo-700">{summary.total_metric_points}</p>
                <p className="text-xs text-indigo-500 mt-0.5">Pontos de métrica</p>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
                <p className="text-sm font-semibold text-gray-700">{summary.uptime_info}</p>
                <p className="text-xs text-gray-500 mt-0.5">Uptime</p>
              </div>
              <div className={`rounded-lg border p-3 text-center ${
                summary.alert_status === "ok" || summary.alert_status === "healthy"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}>
                <Badge status={summary.alert_status} />
                <p className="text-xs text-gray-500 mt-1">Status de alertas</p>
              </div>
              <div className={`rounded-lg border p-3 text-center ${
                summary.status === "ok" || summary.status === "healthy"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}>
                <Badge status={summary.status} />
                <p className="text-xs text-gray-500 mt-1">Status geral</p>
              </div>
            </div>
          </Card>

          {Object.keys(summary.operations).length > 0 && (
            <Card title="Operações">
              <div className="space-y-4">
                {Object.entries(summary.operations).map(([name, op]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700 font-mono">{name}</p>
                      <div className="flex gap-2 text-xs">
                        {op.error_count > 0 && (
                          <span className="text-red-600 font-medium">⚠ {op.error_count} erros</span>
                        )}
                        <LatencyBadge ms={op.avg_latency} />
                      </div>
                    </div>
                    <MiniBar value={op.request_count} max={maxReqs} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {summary.recent_errors.length > 0 && (
            <Card title="Erros Recentes">
              <ul className="space-y-2">
                {summary.recent_errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <span className="text-red-400 mt-0.5">⚠</span>
                    <div className="flex-1">
                      <p className="text-red-800 font-medium">{e.name}</p>
                      {Object.keys(e.dimensions).length > 0 && (
                        <p className="text-xs text-red-600 font-mono">{JSON.stringify(e.dimensions)}</p>
                      )}
                    </div>
                    <span className="text-xs text-red-400 shrink-0">
                      {new Date(e.timestamp).toLocaleTimeString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
