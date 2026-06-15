import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  listUsers,
  updateAdminUser,
  deleteAdminUser,
  resetUserPassword,
  getAdminStats,
  getReposHealth,
  getUsageDashboard,
  getLlmFeedback,
  getLlmCosts,
  getIngestionQueue,
  getPlanLimits,
  updatePlanLimit,
  getAuditLog,
  type UserSummary,
  type AdminStats,
  type RepoHealthRecord,
  type UsageSummary,
  type LlmFeedbackResponse,
  type LlmCostSummary,
  type IngestionQueueResponse,
  type PlanLimit,
  type AuditEntry,
} from "../../services/adminApi"
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  getWebhookUrl,
  type WebhookRecord,
  type WebhookCreated,
} from "../../services/webhookApi"
import {
  Card,
  ThinkingDots,
  EmptyState,
  ErrorBanner,
  btnPrimary,
  btnSecondary,
  Icon,
} from "../ui"

const PLAN_OPTIONS = ["free", "paid", "enterprise"]
const ROLE_OPTIONS = ["free", "admin"]

const PLAN_COLORS: Record<string, string> = {
  free:       "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  paid:       "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  enterprise: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
}
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  free:  "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  paid:  "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  enterprise: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
}

// ── Stats Cards ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
      <Icon name={icon} className="text-xl shrink-0" />
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      </div>
    </div>
  )
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

function EditModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserSummary
  onClose: () => void
  onSaved: (updated: UserSummary) => void
}) {
  const [role, setRole] = useState(user.role)
  const [plan, setPlan] = useState(user.plan)
  const [emailVerified, setEmailVerified] = useState(user.email_verified)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function onSave() {
    setSaving(true)
    setError("")
    try {
      const updated = await updateAdminUser(user.user_id, { role, plan, email_verified: emailVerified })
      onSaved(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Editar usuário</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 font-mono truncate">{user.email}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Plano</label>
            <div className="flex gap-2 flex-wrap">
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                    plan === p
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Role</label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                    role === r
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-amber-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={emailVerified}
              onChange={(e) => setEmailVerified(e.target.checked)}
              className="accent-emerald-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">E-mail verificado</span>
          </label>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className={`${btnSecondary} flex-1 justify-center`}>Cancelar</button>
          <button onClick={onSave} disabled={saving} className={`${btnPrimary} flex-1 justify-center`}>
            {saving ? <><Icon name="spinner" className="animate-spin" /> Salvando…</> : "Salvar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onEdit,
  onDelete,
  onResetPw,
}: {
  user: UserSummary
  onEdit: (u: UserSummary) => void
  onDelete: (id: string) => void
  onResetPw: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="circle-user" className="text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[200px]">{user.email}</p>
            <p className="text-[10px] font-mono text-gray-400 truncate">{user.user_id.slice(0, 12)}…</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[user.plan] ?? PLAN_COLORS.free}`}>
          {user.plan}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[user.role] ?? ROLE_COLORS.free}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {user.email_verified
          ? <Icon name="circle-check" className="text-emerald-500" />
          : <Icon name="circle-xmark" className="text-gray-300 dark:text-gray-600" />}
      </td>
      <td className="px-4 py-3 text-center text-xs text-gray-500">{user.repos_indexed_count}</td>
      <td className="px-4 py-3 text-center text-xs text-gray-500">{user.questions_asked_count}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onEdit(user)}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Icon name="pen-to-square" />
          </button>
          <button
            onClick={() => onResetPw(user.user_id)}
            title="Resetar senha"
            className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            <Icon name="key" />
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Deletar"
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Icon name="trash" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(user.user_id); setConfirmDelete(false) }}
                className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 text-[10px] transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </td>
    </motion.tr>
  )
}

// ── LLM Cost Monitor section ──────────────────────────────────────────────────

function LlmCostSection() {
  const [data, setData] = useState<LlmCostSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [days, setDays] = useState(30)

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    getLlmCosts(days)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false))
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-slate-400">Período:</label>
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`text-xs px-3 py-1 rounded-lg border transition ${days === d ? "bg-violet-700 border-violet-500 text-white" : "border-slate-600 text-slate-300 hover:bg-slate-700"}`}
          >{d} dias</button>
        ))}
        <button onClick={load} className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition">
          <Icon name="rotate" className="mr-1" />Atualizar
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <div className="py-8 flex justify-center"><ThinkingDots label="Carregando custos…" /></div>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Custo Total", value: `$${data.total_cost_usd.toFixed(4)}`, icon: "dollar-sign", color: "text-emerald-400" },
              { label: "Chamadas", value: String(data.total_calls), icon: "bolt", color: "text-blue-400" },
              { label: "Tokens (entrada)", value: data.total_tokens_in.toLocaleString(), icon: "arrow-right-to-bracket", color: "text-purple-400" },
              { label: "Projeção 30d", value: `$${data.monthly_projection_usd.toFixed(4)}`, icon: "chart-bar", color: "text-orange-400" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <Icon name={icon} className={`${color} text-xl mb-1`} />
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* By provider */}
          {Object.keys(data.by_provider).length > 0 && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h4 className="text-xs font-semibold text-slate-300 mb-3">Custo por Provedor</h4>
              {Object.entries(data.by_provider).map(([prov, cost]) => (
                <div key={prov} className="flex justify-between text-sm py-1 border-b border-slate-700 last:border-0">
                  <span className="text-slate-300 capitalize">{prov}</span>
                  <span className="text-emerald-400 font-mono">${(cost as number).toFixed(6)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Daily cost */}
          {Object.keys(data.by_day).length > 0 && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h4 className="text-xs font-semibold text-slate-300 mb-3">Custo Diário</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {Object.entries(data.by_day).reverse().map(([day, cost]) => (
                  <div key={day} className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-400 font-mono">{day}</span>
                    <span className="text-slate-200 font-mono">${(cost as number).toFixed(6)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent calls */}
          {data.recent.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h4 className="text-xs font-semibold text-slate-300 mb-3">Chamadas Recentes</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left py-1 px-2">Endpoint</th>
                      <th className="text-left py-1 px-2">Provedor</th>
                      <th className="text-right py-1 px-2">Tokens In</th>
                      <th className="text-right py-1 px-2">Tokens Out</th>
                      <th className="text-right py-1 px-2">Custo</th>
                      <th className="text-left py-1 px-2">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map(r => (
                      <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/40">
                        <td className="py-1 px-2 text-slate-300">{r.endpoint || "—"}</td>
                        <td className="py-1 px-2 text-slate-400 capitalize">{r.provider}</td>
                        <td className="py-1 px-2 text-right text-slate-300">{r.tokens_in.toLocaleString()}</td>
                        <td className="py-1 px-2 text-right text-slate-300">{r.tokens_out.toLocaleString()}</td>
                        <td className="py-1 px-2 text-right text-emerald-400 font-mono">${r.cost_usd.toFixed(6)}</td>
                        <td className="py-1 px-2 text-slate-400">{r.timestamp.slice(0, 16).replace("T", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Ingestion Queue section ───────────────────────────────────────────────────

function IngestionQueueSection() {
  const [data, setData] = useState<IngestionQueueResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    getIngestionQueue()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [autoRefresh, load])

  const STEP_COLORS: Record<string, string> = {
    completed: "bg-emerald-600",
    failed:    "bg-red-600",
    embedding: "bg-blue-600",
    chunking:  "bg-indigo-600",
    cloning:   "bg-violet-600",
    detecting: "bg-purple-600",
    storing:   "bg-cyan-600",
    queued:    "bg-slate-600",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={load} className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1">
          <Icon name="rotate" className={loading ? "animate-spin" : ""} />Atualizar
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={e => setAutoRefresh(e.target.checked)}
            className="accent-violet-500"
          />
          Auto-refresh (3s)
        </label>
        {data && (
          <span className="text-xs text-slate-400 ml-auto">
            {data.active} ativo(s) · {data.total} total
          </span>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {data && (
        <div className="space-y-3">
          {data.items.length === 0 ? (
            <EmptyState icon="list-check" message="Nenhum repositório na fila." />
          ) : (
            data.items.map(item => (
              <div key={item.repository_id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <span className="text-sm text-slate-200 font-medium truncate max-w-xs">{item.repository_url}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STEP_COLORS[item.status] ?? "bg-slate-600"} text-white`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${STEP_COLORS[item.status] ?? "bg-slate-600"}`}
                      style={{ width: `${item.progress_pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-10 text-right">{item.progress_pct}%</span>
                </div>
                {item.current_step && (
                  <div className="text-xs text-slate-400 mt-0.5">{item.current_step}</div>
                )}
                {item.error_message && (
                  <div className="text-xs text-red-400 mt-1 truncate">{item.error_message}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Plan Limits section ───────────────────────────────────────────────────────

function PlanLimitsSection() {
  const [plans, setPlans] = useState<PlanLimit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<PlanLimit | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    getPlanLimits()
      .then(setPlans)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const updated = await updatePlanLimit(editing.plan, {
        max_repos: editing.max_repos,
        max_questions: editing.max_questions,
        can_delete_repo: editing.can_delete_repo,
      })
      setPlans(prev => prev.map(p => p.plan === updated.plan ? updated : p))
      setEditing(null)
      setToast(`Plano "${updated.plan}" atualizado com sucesso!`)
      setTimeout(() => setToast(""), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const PLAN_COLORS_EDIT: Record<string, string> = {
    free: "border-slate-600 bg-slate-800",
    paid: "border-indigo-700 bg-indigo-950/40",
    enterprise: "border-purple-700 bg-purple-950/40",
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      {loading && <div className="py-8 flex justify-center"><ThinkingDots label="Carregando planos…" /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.plan} className={`rounded-xl p-5 border ${PLAN_COLORS_EDIT[p.plan] ?? "border-slate-700 bg-slate-800"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-bold text-white capitalize">{p.plan}</span>
              <button
                onClick={() => setEditing({ ...p })}
                className="text-xs px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1"
              >
                <Icon name="pen" />Editar
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Max repos:</span>
                <span className="font-semibold">{p.max_repos}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Max perguntas:</span>
                <span className="font-semibold">{p.max_questions}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Pode deletar repos:</span>
                <span className={p.can_delete_repo ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                  {p.can_delete_repo ? "Sim" : "Não"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl"
            >
              <h3 className="text-base font-bold text-white mb-4 capitalize">
                Editar plano <span className="text-purple-400">{editing.plan}</span>
              </h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-slate-400">Max repos</span>
                  <input
                    type="number"
                    min={1}
                    value={editing.max_repos}
                    onChange={e => setEditing({ ...editing, max_repos: Number(e.target.value) })}
                    className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-400">Max perguntas</span>
                  <input
                    type="number"
                    min={1}
                    value={editing.max_questions}
                    onChange={e => setEditing({ ...editing, max_questions: Number(e.target.value) })}
                    className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.can_delete_repo}
                    onChange={e => setEditing({ ...editing, can_delete_repo: e.target.checked })}
                    className="accent-violet-500"
                  />
                  Pode deletar repositórios
                </label>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition"
                >Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold transition disabled:opacity-50"
                >{saving ? "Salvando…" : "Salvar"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  )
}

// ── Audit Log Section ─────────────────────────────────────────────────────────

function AuditLogSection() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filterUser, setFilterUser] = useState("")
  const [filterAction, setFilterAction] = useState("")
  const [filterResource, setFilterResource] = useState("")
  const [days, setDays] = useState(30)
  const [limit, setLimit] = useState(100)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await getAuditLog({
        user_id: filterUser || undefined,
        action: filterAction || undefined,
        resource_type: filterResource || undefined,
        days,
        limit,
      })
      setEntries(res.entries)
    } catch (e: any) {
      setError(e.message || "Erro ao carregar audit log")
    } finally {
      setLoading(false)
    }
  }, [filterUser, filterAction, filterResource, days, limit])

  useEffect(() => { load() }, [load])

  const inputCls = "bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <Icon name="clipboard-list" className="text-amber-600 dark:text-amber-400 text-xl" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Audit Log</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Histórico de ações administrativas e de usuários</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            placeholder="Filtrar por user_id / email"
            className={inputCls + " flex-1 min-w-[160px]"}
          />
          <input
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            placeholder="Ação (ex: POST)"
            className={inputCls + " w-32"}
          />
          <input
            value={filterResource}
            onChange={e => setFilterResource(e.target.value)}
            placeholder="Recurso (ex: repos)"
            className={inputCls + " w-36"}
          />
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className={inputCls + " w-28"}
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className={inputCls + " w-24"}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <button onClick={load} className={btnSecondary + " text-xs"} disabled={loading}>
            <Icon name="rotate" className={`mr-1 ${loading ? "animate-spin" : ""}`} />Buscar
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center"><ThinkingDots label="Carregando…" /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon="clipboard-list" message="Nenhuma entrada encontrada para os filtros selecionados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="py-2 px-2">Data/Hora</th>
                  <th className="py-2 px-2">Usuário</th>
                  <th className="py-2 px-2">Ação</th>
                  <th className="py-2 px-2">Recurso</th>
                  <th className="py-2 px-2">ID Recurso</th>
                  <th className="py-2 px-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-2 px-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(e.timestamp).toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-2 text-xs text-gray-700 dark:text-gray-300 max-w-[140px] truncate" title={e.user_email}>{e.user_email || e.user_id}</td>
                    <td className="py-2 px-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">{e.action}</span>
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-500 dark:text-gray-400">{e.resource_type}</td>
                    <td className="py-2 px-2 text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-[100px]">{e.resource_id}</td>
                    <td className="py-2 px-2 text-xs text-gray-400 dark:text-gray-500 font-mono">{e.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 mt-2 text-right">{entries.length} resultado(s)</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Webhook Section ───────────────────────────────────────────────────────────

function WebhookSection() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [repoId, setRepoId] = useState("")
  const [provider, setProvider] = useState<"github" | "gitlab" | "bitbucket">("github")
  const [creating, setCreating] = useState(false)
  const [secretModal, setSecretModal] = useState<WebhookCreated | null>(null)
  const [copiedField, setCopiedField] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await listWebhooks()
      setWebhooks(data)
    } catch (e: any) {
      setError(e.message || "Erro ao carregar webhooks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!repoUrl.trim() || !repoId.trim()) return
    setCreating(true)
    setError("")
    try {
      const created = await createWebhook(repoId.trim(), repoUrl.trim(), provider)
      await load()
      setSecretModal(created)
      setRepoUrl("")
      setRepoId("")
    } catch (e: any) {
      setError(e.message || "Erro ao criar webhook")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este webhook?")) return
    try {
      await deleteWebhook(id)
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch (e: any) {
      setError(e.message || "Erro ao remover")
    }
  }

  function copy(value: string, field: string) {
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(""), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <Icon name="bolt" className="text-indigo-600 dark:text-indigo-400 text-xl" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Webhooks</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Reindexação automática ao receber push events</p>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}

      {/* Create form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
          <Icon name="plus-circle" className="text-indigo-500" />Criar Webhook
        </h4>
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={repoId}
              onChange={e => setRepoId(e.target.value)}
              placeholder="Repository ID (UUID)"
              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="URL do repositório (ex: https://github.com/…)"
              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={provider}
              onChange={e => setProvider(e.target.value as any)}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="bitbucket">Bitbucket</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={!repoUrl.trim() || !repoId.trim() || creating}
              className={btnPrimary + " flex-1"}
            >
              {creating ? <ThinkingDots /> : <><Icon name="bolt" className="mr-1.5" />Criar</>}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Icon name="list" className="text-indigo-500" />Webhooks ({webhooks.length})
          </h4>
          <button onClick={load} className={btnSecondary + " text-xs"} disabled={loading}>
            <Icon name="rotate" className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {loading ? (
          <div className="py-6 flex justify-center"><ThinkingDots /></div>
        ) : webhooks.length === 0 ? (
          <EmptyState icon="bolt" message="Nenhum webhook cadastrado." />
        ) : (
          <div className="space-y-2">
            {webhooks.map(wh => (
              <div key={wh.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">{wh.provider}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${wh.active ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                      {wh.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{wh.repository_url}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 dark:text-gray-500">URL do webhook:</span>
                  <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {getWebhookUrl(wh.id)}
                  </code>
                  <button
                    onClick={() => copy(getWebhookUrl(wh.id), wh.id + "-url")}
                    className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <Icon name={copiedField === wh.id + "-url" ? "check" : "copy"} />
                  </button>
                </div>
                {wh.last_triggered_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Último push: {new Date(wh.last_triggered_at).toLocaleString("pt-BR")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secret modal */}
      <AnimatePresence>
        {secretModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSecretModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Icon name="triangle-exclamation" className="text-xl" />
                <h3 className="font-bold text-gray-900 dark:text-white">Salve o secret agora!</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Este secret HMAC só é exibido uma vez. Salve-o em segurança.</p>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Secret HMAC</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-700 dark:text-emerald-300 break-all">
                    {secretModal.secret}
                  </code>
                  <button
                    onClick={() => copy(secretModal.secret, "secret")}
                    className="px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition"
                  >
                    <Icon name={copiedField === "secret" ? "check" : "copy"} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">URL do Webhook</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-indigo-700 dark:text-indigo-300 break-all">
                    {getWebhookUrl(secretModal.id)}
                  </code>
                  <button
                    onClick={() => copy(getWebhookUrl(secretModal.id), "wh-url")}
                    className="px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition"
                  >
                    <Icon name={copiedField === "wh-url" ? "check" : "copy"} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Configure no GitHub: Settings → Webhooks → Add webhook. Content type: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">application/json</code></p>
              <button onClick={() => setSecretModal(null)} className={btnPrimary + " w-full"}>Entendido, fechei</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type AdminSection = "users" | "health" | "usage" | "llm" | "custos" | "fila" | "planos" | "auditoria" | "webhooks"

const ADMIN_TABS: { id: AdminSection; label: string; icon: string }[] = [
  { id: "users",     label: "Usuários",      icon: "users" },
  { id: "health",    label: "Saúde Repos",   icon: "heart-pulse" },
  { id: "usage",     label: "Uso",           icon: "chart-line" },
  { id: "llm",       label: "Qualidade LLM", icon: "star-half-stroke" },
  { id: "custos",    label: "Custos LLM",    icon: "dollar-sign" },
  { id: "fila",      label: "Fila",          icon: "list-check" },
  { id: "planos",    label: "Planos",        icon: "sliders" },
  { id: "auditoria", label: "Auditoria",     icon: "clipboard-list" },
  { id: "webhooks",  label: "Webhooks",      icon: "bolt" },
]

// ── Repos Health section ───────────────────────────────────────────────────────

function ReposHealthSection() {
  const [data, setData] = useState<ReturnType<typeof Object.create> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    setError("")
    getReposHealth()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 flex justify-center"><ThinkingDots label="Carregando saúde dos repositórios…" /></div>
  if (error) return <ErrorBanner message={error} />
  if (!data) return null

  const repos: RepoHealthRecord[] = (data as { repositories: RepoHealthRecord[] }).repositories
  const byStatus: Record<string, number> = (data as { by_status: Record<string, number> }).by_status

  const STATUS_COLORS: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    failed:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    cloning:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    queued:    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  }

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(byStatus).map(([s, count]) => (
          <div key={s} className={`rounded-xl border px-4 py-3 ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
            <p className="text-xl font-bold">{count}</p>
            <p className="text-[10px] uppercase tracking-wide opacity-70 capitalize">{s}</p>
          </div>
        ))}
      </div>

      {/* Repo list */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-[10px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2">Repositório</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Chunks</th>
                <th className="px-3 py-2 text-right">Arquivos</th>
                <th className="px-3 py-2">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((r) => (
                <tr key={r.repository_id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <p className="font-mono text-[11px] text-gray-700 dark:text-gray-300 truncate max-w-[260px]">{r.repository_url}</p>
                    <p className="text-[9px] text-gray-400 font-mono">{r.repository_id.slice(0, 12)}…</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                    {r.error_message && (
                      <p className="text-[9px] text-red-500 mt-0.5 truncate max-w-[200px]">{r.error_message}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{r.chunk_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{r.file_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-400">{r.updated_at?.slice(0, 16).replace("T", " ") ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {repos.length === 0 && (
            <div className="py-8"><EmptyState icon="folder-open" title="Nenhum repositório encontrado" /></div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Usage Dashboard section ───────────────────────────────────────────────────

function UsageDashboardSection() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    load()
  }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  function load() {
    setLoading(true)
    setError("")
    getUsageDashboard(days)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false))
  }

  const topEvents = data
    ? Object.entries(data.by_event_type)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : []
  const maxEventCount = topEvents[0]?.[1] ?? 1

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Período:</span>
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              days === d
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <div className="py-8 flex justify-center"><ThinkingDots label="Carregando dados de uso…" /></div>}

      {data && !loading && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{data.total_events.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wide text-indigo-500">Total de eventos</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{data.total_sessions.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wide text-emerald-500">Sessões únicas</p>
            </div>
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
              <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{data.daily_buckets.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-sky-500">Dias com atividade</p>
            </div>
          </div>

          {/* Event type breakdown */}
          {topEvents.length > 0 && (
            <Card title="Eventos por tipo">
              <div className="space-y-2">
                {topEvents.map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-mono text-gray-700 dark:text-gray-300">{type}</span>
                      <span className="text-gray-400">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxEventCount) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Daily sparkline */}
          {data.daily_buckets.length > 0 && (
            <Card title="Atividade diária">
              <div className="flex items-end gap-1 h-16">
                {data.daily_buckets.map((b) => {
                  const maxEvts = Math.max(...data.daily_buckets.map((x) => x.event_count))
                  const pct = maxEvts > 0 ? (b.event_count / maxEvts) * 100 : 0
                  return (
                    <div key={b.date} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
                      <div
                        className="w-full rounded-t bg-indigo-400 dark:bg-indigo-500 transition-all"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        title={`${b.date}: ${b.event_count} eventos`}
                      />
                      {/* tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {b.date.slice(5)}: {b.event_count}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                <span>{data.daily_buckets[0]?.date?.slice(5)}</span>
                <span>{data.daily_buckets[data.daily_buckets.length - 1]?.date?.slice(5)}</span>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ── LLM Quality section ───────────────────────────────────────────────────────

function LlmQualitySection() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<LlmFeedbackResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    load()
  }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  function load() {
    setLoading(true)
    setError("")
    getLlmFeedback(days)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Período:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              days === d
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <div className="py-8 flex justify-center"><ThinkingDots label="Carregando feedback…" /></div>}

      {data && !loading && (
        <>
          {data.total === 0 ? (
            <EmptyState icon="star-half-stroke" title="Sem feedback ainda" description="Os usuários ainda não avaliaram respostas do LLM." />
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.total}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Total</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{data.positive}</p>
                  <p className="text-[10px] uppercase tracking-wide text-emerald-500">Positivo</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{data.negative}</p>
                  <p className="text-[10px] uppercase tracking-wide text-red-500">Negativo</p>
                </div>
                <div className={`border rounded-xl p-4 text-center ${data.positive_rate >= 0.7 ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"}`}>
                  <p className={`text-2xl font-bold ${data.positive_rate >= 0.7 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {(data.positive_rate * 100).toFixed(0)}%
                  </p>
                  <p className={`text-[10px] uppercase tracking-wide ${data.positive_rate >= 0.7 ? "text-emerald-500" : "text-amber-500"}`}>Taxa positiva</p>
                </div>
              </div>

              {/* Avg scores */}
              <Card>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Utilidade média", value: data.avg_usefulness },
                    { label: "Correção média", value: data.avg_correctness },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{label}</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{value.toFixed(2)}/5</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(value / 5) * 100}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full bg-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent feedback */}
              <Card title="Feedback recente">
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {data.records.slice(0, 20).map((r) => (
                    <div key={r.feedback_id} className="flex items-start gap-3 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                      <Icon
                        name={r.thumbs_up ? "thumbs-up" : "thumbs-down"}
                        className={r.thumbs_up ? "text-emerald-500 mt-0.5" : "text-red-400 mt-0.5"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono text-gray-500 truncate">{r.repository_id.slice(0, 12)}… / {r.response_id.slice(0, 12)}…</p>
                        {r.comment && <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{r.comment}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{r.timestamp.slice(0, 16).replace("T", " ")}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

export function AdminTab() {
  const [adminSection, setAdminSection] = useState<AdminSection>("users")
  const [users, setUsers] = useState<UserSummary[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editUser, setEditUser] = useState<UserSummary | null>(null)
  const [toast, setToast] = useState("")

  // Filters
  const [filterPlan, setFilterPlan] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true)
    setError("")
    try {
      const [usersResp, statsResp] = await Promise.all([
        listUsers(),
        getAdminStats(),
      ])
      setUsers(usersResp.users)
      setStats(statsResp)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados de administração.")
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  async function handleDelete(userId: string) {
    try {
      await deleteAdminUser(userId)
      setUsers((prev) => prev.filter((u) => u.user_id !== userId))
      showToast("Usuário removido com sucesso.")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao deletar usuário.")
    }
  }

  async function handleResetPw(userId: string) {
    try {
      await resetUserPassword(userId)
      showToast("E-mail de redefinição de senha enviado.")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao resetar senha.")
    }
  }

  function handleSaved(updated: UserSummary) {
    setUsers((prev) => prev.map((u) => u.user_id === updated.user_id ? updated : u))
    setEditUser(null)
    showToast("Usuário atualizado com sucesso.")
  }

  const filtered = users.filter((u) => {
    if (filterPlan && u.plan !== filterPlan) return false
    if (filterRole && u.role !== filterRole) return false
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-200 dark:shadow-amber-900/40">
          <Icon name="shield-halved" className="text-white text-base" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Painel de Administração</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie usuários, planos e permissões</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAdminSection(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              adminSection === tab.id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {error && adminSection === "users" && <ErrorBanner message={error} />}

      {/* Saúde dos Repos */}
      {adminSection === "health" && <ReposHealthSection />}

      {/* Dashboard de Uso */}
      {adminSection === "usage" && <UsageDashboardSection />}

      {/* Avaliação LLM */}
      {adminSection === "llm" && <LlmQualitySection />}

      {/* Custos LLM */}
      {adminSection === "custos" && <LlmCostSection />}

      {/* Fila de Ingestão */}
      {adminSection === "fila" && <IngestionQueueSection />}

      {/* Gerenciar Planos */}
      {adminSection === "planos" && <PlanLimitsSection />}

      {/* Auditoria */}
      {adminSection === "auditoria" && <AuditLogSection />}

      {/* Webhooks */}
      {adminSection === "webhooks" && <WebhookSection />}

      {/* Users section */}
      {adminSection === "users" && (<>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="users" label="Total usuários" value={String(stats.total_users)}
            color="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" />
          <StatCard icon="folder-open" label="Repos indexados" value={String(stats.total_repos_indexed)}
            color="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" />
          <StatCard icon="comments" label="Perguntas feitas" value={String(stats.total_questions_asked)}
            color="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300" />
          <StatCard
            icon="crown"
            label="Enterprise"
            value={String(stats.by_plan.enterprise ?? 0)}
            color="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
          />
        </div>
      )}

      {/* User table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mr-auto">
            Usuários <span className="text-gray-400 font-normal">({filtered.length})</span>
          </p>

          {/* Search */}
          <div className="relative">
            <Icon name="magnifying-glass" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email…"
              className="text-xs pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-44"
            />
          </div>

          {/* Plan filter */}
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none"
          >
            <option value="">Todos planos</option>
            {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none"
          >
            <option value="">Todos roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <button onClick={loadAll} className={`${btnSecondary} text-xs`} title="Recarregar">
            <Icon name="arrows-rotate" />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <ThinkingDots label="Carregando usuários…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8">
            <EmptyState icon="users" title="Nenhum usuário encontrado" description="Ajuste os filtros para ver resultados." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2">Usuário</th>
                  <th className="px-4 py-2">Plano</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2 text-center">Verificado</th>
                  <th className="px-4 py-2 text-center">Repos</th>
                  <th className="px-4 py-2 text-center">Perguntas</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((u) => (
                    <UserRow
                      key={u.user_id}
                      user={u}
                      onEdit={setEditUser}
                      onDelete={handleDelete}
                      onResetPw={handleResetPw}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan distribution */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Distribuição por plano</p>
            <div className="space-y-2">
              {Object.entries(stats.by_plan).map(([plan, count]) => {
                const pct = Math.round((count / stats.total_users) * 100)
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="capitalize text-gray-700 dark:text-gray-300">{plan}</span>
                      <span className="text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-indigo-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Distribuição por role</p>
            <div className="space-y-2">
              {Object.entries(stats.by_role).map(([role, count]) => {
                const pct = Math.round((count / stats.total_users) * 100)
                return (
                  <div key={role}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="capitalize text-gray-700 dark:text-gray-300">{role}</span>
                      <span className="text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-amber-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* end of adminSection === "users" */}
      </>)}

      {/* Edit modal (always mounted so it can animate out) */}
      <AnimatePresence>
        {editUser && (
          <EditModal
            user={editUser}
            onClose={() => setEditUser(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2"
          >
            <Icon name="circle-check" className="text-emerald-400 dark:text-emerald-600" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
