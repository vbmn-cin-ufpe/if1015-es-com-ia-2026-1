import { FormEvent, useEffect, useRef, useState } from "react"
import { indexRepository, getRepositoryStatus, type RepoStatusResponse } from "../../services/repoApi"
import { Card, Badge, ProgressBar, ThinkingDots, btnPrimary, btnSecondary, inputCls } from "../ui"

// Map backend status → progress percentage (real stages, not simulated)
const STATUS_PROGRESS: Record<string, number> = {
  queued:    5,
  cloning:   20,
  detecting: 35,
  chunking:  55,
  embedding: 80,
  storing:   92,
  completed: 100,
  failed:    0,
}

const STATUS_LABEL: Record<string, string> = {
  queued:    "Aguardando início…",
  cloning:   "Clonando repositório…",
  detecting: "Detectando linguagens…",
  chunking:  "Construindo chunks de código…",
  embedding: "Gerando embeddings semânticos…",
  storing:   "Armazenando vetores no ChromaDB…",
  completed: "Indexação concluída!",
  failed:    "Falha na indexação",
}

const LANG_ICONS: Record<string, string> = {
  python:     "🐍",
  javascript: "🟨",
  typescript: "🔷",
  java:       "☕",
  go:         "🐹",
  rust:       "🦀",
}

interface Props {
  repositoryId: string
  status: string
  onIndexed: (id: string, status: string) => void
}

export function RepoTab({ repositoryId, status, onIndexed }: Props) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [stepLabel, setStepLabel] = useState(STATUS_LABEL.queued)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [repoStats, setRepoStats] = useState<RepoStatusResponse["stats"] | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  function startPolling(repoId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await getRepositoryStatus(repoId)
        const pct = STATUS_PROGRESS[r.index_status] ?? 50
        const label = STATUS_LABEL[r.index_status] ?? "Processando…"
        setProgress(pct)
        setStepLabel(label)
        onIndexed(repoId, r.index_status)

        if (r.index_status === "completed" || r.index_status === "failed") {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setLoading(false)
          if (r.stats) setRepoStats(r.stats)
          if (r.error_message) setErrorMsg(r.error_message)
        }
      } catch {
        // Ignore transient polling errors — will retry on next tick
      }
    }, 2000)
  }

  async function onIndex(e: FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setErrorMsg(null)
    setRepoStats(null)
    setLoading(true)
    setProgress(STATUS_PROGRESS.queued)
    setStepLabel(STATUS_LABEL.queued)
    try {
      // Returns immediately with repository_id + status="queued"
      const r = await indexRepository(url.trim())
      onIndexed(r.repository_id, r.job_status)
      startPolling(r.repository_id)
    } catch {
      setErrorMsg("Falha ao iniciar indexação. Verifique a URL e tente novamente.")
      setLoading(false)
    }
  }

  async function onRefresh() {
    if (!repositoryId) return
    try {
      const r = await getRepositoryStatus(repositoryId)
      onIndexed(repositoryId, r.index_status)
      if (r.stats) setRepoStats(r.stats)
      if (r.error_message) setErrorMsg(r.error_message)
    } catch {
      setErrorMsg("Falha ao verificar status")
    }
  }

  // Parse language stats from backend response
  const langMap = repoStats?.languages as Record<string, number> | undefined
  const languages = langMap ? Object.entries(langMap).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="space-y-5">
      <Card title="Indexar Repositório">
        <p className="text-sm text-gray-500 mb-4">
          Informe a URL de um repositório GitHub público para que o CodeCompass o indexe.
          Suporta: Python, JavaScript, TypeScript, Java, Go e Rust.
        </p>
        <form onSubmit={onIndex} className="flex gap-3">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            disabled={loading}
            className={`${inputCls} flex-1`}
          />
          <button type="submit" disabled={loading || !url.trim()} className={btnPrimary}>
            {loading ? "Indexando…" : "📁 Indexar"}
          </button>
        </form>

        {loading && (
          <div className="mt-5 space-y-3">
            <ProgressBar value={progress} />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <ThinkingDots label={stepLabel} />
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}
      </Card>

      {repositoryId && (
        <Card title="Status do Repositório">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 mb-1">ID do Repositório</p>
              <p className="font-mono text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                {repositoryId}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <Badge status={status || "pending"} />
            </div>
            <button onClick={onRefresh} className={btnSecondary}>
              ↻ Atualizar
            </button>
            {status === "completed" && (
              <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                ✓ Pronto para uso
              </span>
            )}
          </div>

          {/* Language detection results */}
          {languages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Linguagens detectadas</p>
              <div className="flex flex-wrap gap-2">
                {languages.map(([lang, count]) => (
                  <span key={lang}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full">
                    <span>{LANG_ICONS[lang] ?? "📄"}</span>
                    <span>{lang}</span>
                    <span className="text-indigo-400 font-normal">{count} arquivo{count !== 1 ? "s" : ""}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats summary */}
          {repoStats && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
              {repoStats.source_files != null && (
                <span>📄 <strong>{String(repoStats.source_files)}</strong> arquivos indexados</span>
              )}
              {repoStats.chunks != null && (
                <span>🧩 <strong>{String(repoStats.chunks)}</strong> chunks</span>
              )}
              {repoStats.vectors != null && (
                <span>🔢 <strong>{String(repoStats.vectors)}</strong> vetores</span>
              )}
            </div>
          )}

          {status === "indexing" && (
            <div className="mt-4">
              <ProgressBar value={progress || 50} />
              <p className="text-xs text-gray-500 mt-1">Indexação em andamento — atualize para ver o progresso</p>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-red-600 mb-0.5">Detalhes do erro:</p>
              <p className="text-xs text-red-700 font-mono break-all">{errorMsg}</p>
            </div>
          )}

          {status === "completed" && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              {[
                { icon: "💬", label: "Chat", desc: "Faça perguntas em linguagem natural" },
                { icon: "🗺️", label: "Tour", desc: "Guia automático de onboarding" },
                { icon: "🔗", label: "Grafo", desc: "Mapa de dependências dos módulos" },
              ].map(f => (
                <div key={f.label} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <span className="text-lg">{f.icon}</span>
                  <p className="font-medium text-indigo-800 mt-1">{f.label}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
