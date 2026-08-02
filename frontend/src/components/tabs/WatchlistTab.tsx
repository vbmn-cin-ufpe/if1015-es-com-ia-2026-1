import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, Icon, EmptyState, ErrorBanner, ThinkingDots, btnPrimary, btnSecondary } from "../ui"
import { useI18n } from "../../i18n"
import {
  getMyWatchlist,
  watchModule,
  unwatchModule,
  getWatchStatus,
  WatchEntry,
} from "../../services/watchlistApi"

interface Props {
  repositoryId: string
  status: string
}

function WatchButton({
  repositoryId,
  modulePath = "",
  onChanged,
}: {
  repositoryId: string
  modulePath?: string
  onChanged?: () => void
}) {
  const [watching, setWatching] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!repositoryId) return
    getWatchStatus(repositoryId, modulePath)
      .then(s => setWatching(s.watching))
      .catch(() => setWatching(false))
  }, [repositoryId, modulePath])

  async function toggle() {
    setLoading(true)
    try {
      if (watching) {
        await unwatchModule(repositoryId, modulePath)
        setWatching(false)
      } else {
        await watchModule(repositoryId, modulePath)
        setWatching(true)
      }
      onChanged?.()
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  if (watching === null) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
        watching
          ? "bg-violet-800 hover:bg-violet-700 text-violet-200"
          : "bg-slate-700 hover:bg-slate-600 text-slate-300"
      }`}
    >
      <Icon name={watching ? "bell-slash" : "bell"} />
      {loading ? "…" : watching ? "Seguindo" : "Seguir"}
    </button>
  )
}

export { WatchButton }

export function WatchlistTab({ repositoryId, status }: Props) {
    const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [watchlist, setWatchlist] = useState<WatchEntry[]>([])
  const [customModule, setCustomModule] = useState("")
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getMyWatchlist()
      setWatchlist(data)
    } catch (e: any) {
      setError(e.message || "Erro ao carregar watchlist")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  async function handleWatch(modulePath: string) {
    if (!repositoryId) return
    setAdding(true)
    try {
      await watchModule(repositoryId, modulePath)
      await load()
      showToast(`Módulo "${modulePath || "(repositório completo)"}" adicionado à watchlist!`)
      setCustomModule("")
    } catch (e: any) {
      setError(e.message || "Erro ao adicionar")
    } finally {
      setAdding(false)
    }
  }

  async function handleUnwatch(entry: WatchEntry) {
    try {
      await unwatchModule(entry.repository_id, entry.module_path)
      setWatchlist(prev => prev.filter(e => e.id !== entry.id))
      showToast("Removido da watchlist.")
    } catch (e: any) {
      setError(e.message || "Erro ao remover")
    }
  }

  const thisRepoEntries = watchlist.filter(e => e.repository_id === repositoryId)
  const otherEntries = watchlist.filter(e => e.repository_id !== repositoryId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-xl p-6 bg-gradient-to-r from-violet-900/60 to-purple-900/60 border border-violet-700/40">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-700/50">
              <Icon name="bell" className="text-violet-300 text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Minhas Notificações</h2>
              <p className="text-violet-300 text-sm">Receba e-mails quando módulos monitorados forem alterados</p>
            </div>
          </div>
          <button onClick={load} className={btnSecondary} disabled={loading}>
            <Icon name="rotate" className={`mr-1 ${loading ? "animate-spin" : ""}`} />Atualizar
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Add watch for current repo */}
      {status === "completed" && repositoryId && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Icon name="plus-circle" className="text-violet-400" />
            Monitorar no repositório atual
          </h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleWatch("")}
              disabled={adding || thisRepoEntries.some(e => e.module_path === "")}
              className={btnPrimary + " text-xs"}
            >
              <Icon name="folder-open" className="mr-1" />Repositório completo
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={customModule}
              onChange={e => setCustomModule(e.target.value)}
              placeholder="Caminho do módulo, ex: app/services/chat_service.py"
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={() => customModule.trim() && handleWatch(customModule.trim())}
              disabled={!customModule.trim() || adding}
              className="px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm rounded-lg transition disabled:opacity-50"
            >
              {adding ? <ThinkingDots /> : "Adicionar"}
            </button>
          </div>
          {thisRepoEntries.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2">Já monitorando neste repositório:</p>
              <div className="space-y-1">
                {thisRepoEntries.map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Icon name={e.module_path ? "file-code" : "folder-open"} className="text-violet-400 text-xs" />
                      <span className="text-xs font-mono text-slate-300">
                        {e.module_path || "(repositório completo)"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnwatch(e)}
                      className="text-xs text-red-400 hover:text-red-300 transition"
                      title="Remover"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* All watches */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Icon name="list-check" className="text-violet-400" />
          Toda a Watchlist ({watchlist.length})
        </h3>
        {loading ? (
          <div className="flex justify-center py-6"><ThinkingDots /></div>
        ) : watchlist.length === 0 ? (
          <EmptyState
            icon="bell"
            message="Nenhum módulo monitorado. Use o botão 'Seguir' em qualquer módulo do grafo, ou adicione acima."
          />
        ) : (
          <div className="space-y-2">
            {watchlist.map(entry => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-violet-700/40 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon name={entry.module_path ? "file-code" : "folder-open"} className="text-violet-400 text-xs shrink-0" />
                    <span className="text-sm font-mono text-slate-200 truncate">
                      {entry.module_path || "(repositório completo)"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 pl-4">
                    repo: {entry.repository_id.slice(0, 8)}… · desde {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <button
                  onClick={() => handleUnwatch(entry)}
                  className="text-xs text-red-400 hover:text-red-300 transition px-2 py-1 rounded hover:bg-red-900/20"
                  title="Remover watchlist"
                >
                  <Icon name="bell-slash" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2"
          >
            <Icon name="circle-check" className="text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
