import { FormEvent, useState, type ReactNode } from "react"

import { askQuestion, type ChatAskResponse } from "./services/chatApi"
import {
  getDependencyGraph,
  getModuleDetails,
  type GraphPayload,
  type ModuleDetails,
} from "./services/graphApi"
import {
  getTimeline,
  getWhyExplanation,
  type TimelineEntry,
  type WhyResponse,
} from "./services/historyApi"
import {
  getMetrics,
  getQualityReport,
  submitFeedback,
  type MetricsPayload,
  type QualityReport,
} from "./services/metricsApi"
import {
  getReadiness,
  getOperationalSummary,
  type ReadinessResponse,
  type OperationalSummary,
} from "./services/opsApi"
import { getRepositoryStatus, indexRepository } from "./services/repoApi"
import {
  generateTour,
  getTour,
  listTours,
  type TourListResponse,
  type TourResponse,
  type TourSummary,
} from "./services/tourApi"
import {
  signin,
  signup,
  signout,
  listSessions,
  createSession,
  type SessionInfo,
} from "./services/authApi"

type Tab = "repo" | "chat" | "tour" | "graph" | "history" | "metrics" | "ops"

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "repo",    label: "Repositório", icon: "📁" },
  { id: "chat",    label: "Chat",        icon: "💬" },
  { id: "tour",    label: "Tour Guiado", icon: "🗺️" },
  { id: "graph",   label: "Grafo",       icon: "🔗" },
  { id: "history", label: "Histórico",   icon: "📜" },
  { id: "metrics", label: "Métricas",    icon: "📊" },
  { id: "ops",     label: "Operacional", icon: "🔧" },
]

function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      {title && <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>}
      {children}
    </div>
  )
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    indexing:  "bg-yellow-100 text-yellow-800",
    pending:   "bg-blue-100 text-blue-800",
    failed:    "bg-red-100 text-red-800",
    ready:     "bg-green-100 text-green-800",
    ok:        "bg-green-100 text-green-800",
    warning:   "bg-yellow-100 text-yellow-800",
    error:     "bg-red-100 text-red-800",
  }
  const cls = colors[status] ?? "bg-gray-100 text-gray-800"
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.toUpperCase()}
    </span>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("repo")

  // Auth state
  const [authToken, setAuthToken] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authUser, setAuthUser] = useState<{ user_id: string; email: string } | null>(null)
  const [sessions, setSessions] = useState<SessionInfo[]>([])

  const [repositoryUrl, setRepositoryUrl] = useState("")
  const [repositoryId, setRepositoryId] = useState("")
  const [status, setStatus] = useState("")
  const [repoError, setRepoError] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [chat, setChat] = useState<ChatAskResponse | null>(null)
  const [tour, setTour] = useState<TourResponse | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [savedTours, setSavedTours] = useState<TourSummary[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [topK, setTopK] = useState(5)
  const [complexityWeight, setComplexityWeight] = useState(0.4)
  const [churnWeight, setChurnWeight] = useState(0.3)
  const [couplingWeight, setCouplingWeight] = useState(0.3)

  const [graph, setGraph] = useState<GraphPayload | null>(null)
  const [selectedModule, setSelectedModule] = useState<ModuleDetails | null>(null)
  const [graphFilter, setGraphFilter] = useState("")

  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [timelineModule, setTimelineModule] = useState("")
  const [timelineCategory, setTimelineCategory] = useState("")
  const [whyModule, setWhyModule] = useState("")
  const [whyQuestion, setWhyQuestion] = useState("")
  const [whyResult, setWhyResult] = useState<WhyResponse | null>(null)

  const [metricsData, setMetricsData] = useState<MetricsPayload | null>(null)
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null)
  const [feedbackResponseId, setFeedbackResponseId] = useState("")
  const [feedbackUsefulness, setFeedbackUsefulness] = useState(3)
  const [feedbackCorrectness, setFeedbackCorrectness] = useState(3)
  const [feedbackComment, setFeedbackComment] = useState("")
  const [feedbackStatus, setFeedbackStatus] = useState("")

  const [opsReadiness, setOpsReadiness] = useState<ReadinessResponse | null>(null)
  const [opsSummary, setOpsSummary] = useState<OperationalSummary | null>(null)

  async function onSignup() {
    setError("")
    try {
      const r = await signup(authEmail, authPassword)
      setAuthToken(r.token)
      setAuthUser({ user_id: r.user_id, email: r.email })
      setAuthPassword("")
    } catch {
      setError("Falha no cadastro")
    }
  }

  async function onSignin(e: FormEvent) {
    e.preventDefault()
    setError("")
    try {
      const r = await signin(authEmail, authPassword)
      setAuthToken(r.token)
      setAuthUser({ user_id: r.user_id, email: r.email })
      setAuthPassword("")
      setSessions(await listSessions(r.token))
    } catch {
      setError("Credenciais inválidas")
    }
  }

  async function onSignout() {
    if (authToken) await signout(authToken).catch(() => {})
    setAuthToken("")
    setAuthUser(null)
    setSessions([])
  }

  async function onCreateSession() {
    if (!authToken || !repositoryId) return
    try {
      await createSession(authToken, repositoryId)
      setSessions(await listSessions(authToken))
    } catch {
      setError("Falha ao criar sessão")
    }
  }

  async function onIndex(e: FormEvent) {
    e.preventDefault()
    setError("")
    setRepoError(null)
    setLoading(true)
    setChat(null)
    setTour(null)
    setSavedTours([])
    try {
      const r = await indexRepository(repositoryUrl)
      setRepositoryId(r.repository_id)
      setStatus(r.job_status)
    } catch {
      setError("Falha ao indexar repositório")
    } finally {
      setLoading(false)
    }
  }

  async function onRefreshStatus() {
    if (!repositoryId) return
    setError("")
    try {
      const r = await getRepositoryStatus(repositoryId)
      setStatus(r.index_status)
      setRepoError(r.error_message ?? null)
      if (r.index_status === "completed") await onLoadTours(repositoryId)
    } catch {
      setError("Falha ao verificar status")
    }
  }

  async function onAsk(e: FormEvent) {
    e.preventDefault()
    if (!repositoryId) return
    setError("")
    setLoading(true)
    try {
      setChat(await askQuestion(repositoryId, question))
    } catch {
      setError("Falha ao consultar chat")
    } finally {
      setLoading(false)
    }
  }

  async function onGenerateTour() {
    if (!repositoryId || status !== "completed") return
    setError("")
    setLoading(true)
    try {
      setTour(await generateTour(repositoryId, { topK, complexityWeight, churnWeight, couplingWeight }))
      setCurrentStep(0)
      await onLoadTours(repositoryId)
    } catch {
      setError("Falha ao gerar tour guiado")
    } finally {
      setLoading(false)
    }
  }

  async function onLoadTours(repoId: string) {
    try {
      const r: TourListResponse = await listTours(repoId)
      setSavedTours(r.tours)
    } catch {}
  }

  async function onOpenSavedTour(tourId: string) {
    setError("")
    setLoading(true)
    try {
      setTour(await getTour(tourId))
      setCurrentStep(0)
    } catch {
      setError("Falha ao carregar tour salvo")
    } finally {
      setLoading(false)
    }
  }

  async function onLoadGraph() {
    if (!repositoryId || status !== "completed") return
    setError("")
    setLoading(true)
    try {
      setGraph(await getDependencyGraph(repositoryId))
      setSelectedModule(null)
    } catch {
      setError("Falha ao carregar grafo")
    } finally {
      setLoading(false)
    }
  }

  async function onSelectModule(modulePath: string) {
    if (!repositoryId) return
    try {
      setSelectedModule(await getModuleDetails(repositoryId, modulePath))
    } catch {
      setError("Falha ao carregar módulo")
    }
  }

  async function onLoadTimeline() {
    if (!repositoryId || status !== "completed") return
    setError("")
    setLoading(true)
    try {
      setTimeline(
        (await getTimeline(repositoryId, {
          modulePath: timelineModule || undefined,
          category: timelineCategory || undefined,
          limit: 30,
        })).entries
      )
    } catch {
      setError("Falha ao carregar timeline")
    } finally {
      setLoading(false)
    }
  }

  async function onAskWhy(e: FormEvent) {
    e.preventDefault()
    if (!repositoryId || !whyModule || !whyQuestion) return
    setError("")
    setLoading(true)
    try {
      setWhyResult(await getWhyExplanation(repositoryId, whyModule, whyQuestion))
    } catch {
      setError("Falha ao gerar explicação")
    } finally {
      setLoading(false)
    }
  }

  async function onLoadMetrics() {
    if (!repositoryId) return
    setError("")
    setLoading(true)
    try {
      setMetricsData((await getMetrics(repositoryId)).metrics)
    } catch {
      setError("Falha ao carregar métricas")
    } finally {
      setLoading(false)
    }
  }

  async function onLoadQualityReport() {
    if (!repositoryId) return
    setError("")
    setLoading(true)
    try {
      setQualityReport(await getQualityReport(repositoryId))
    } catch {
      setError("Falha ao carregar relatório")
    } finally {
      setLoading(false)
    }
  }

  async function onSubmitFeedback(e: FormEvent) {
    e.preventDefault()
    if (!repositoryId || !feedbackResponseId) return
    setError("")
    setFeedbackStatus("")
    try {
      await submitFeedback({
        repository_id: repositoryId,
        response_id: feedbackResponseId,
        usefulness_score: feedbackUsefulness,
        correctness_score: feedbackCorrectness,
        comment: feedbackComment,
      })
      setFeedbackStatus("Feedback registrado!")
      setFeedbackComment("")
    } catch {
      setError("Falha ao enviar feedback")
    }
  }

  async function onLoadOpsStatus() {
    setError("")
    try {
      const [r, s] = await Promise.all([getReadiness(), getOperationalSummary()])
      setOpsReadiness(r)
      setOpsSummary(s)
    } catch {
      setError("Falha ao carregar status operacional")
    }
  }

  const filteredNodes = graph
    ? graph.nodes.filter(n => n.module_path.toLowerCase().includes(graphFilter.toLowerCase()))
    : []
  const weightsValid = Math.abs(complexityWeight + churnWeight + couplingWeight - 1.0) < 0.01
  const weightSum = (complexityWeight + churnWeight + couplingWeight).toFixed(2)

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
  const btnPrimary = "inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  const btnSecondary = "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧭</span>
            <span className="text-xl font-bold text-gray-900">CodeCompass</span>
            {repositoryId && (
              <span className="ml-3 text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                {repositoryId.slice(0, 8)}…
              </span>
            )}
            {status && <Badge status={status} />}
          </div>

          {/* Auth panel */}
          <div className="flex items-center gap-2">
            {!authUser ? (
              <form onSubmit={onSignin} className="flex items-center gap-2">
                <input
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Senha"
                  type="password"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                  Entrar
                </button>
                <button type="button" onClick={onSignup} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cadastrar
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">👤 {authUser.email}</span>
                {sessions.filter(s => s.status === "active").length > 0 && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    {sessions.filter(s => s.status === "active").length} sessão(ões) ativa(s)
                  </span>
                )}
                {repositoryId && (
                  <button type="button" onClick={onCreateSession} className={btnSecondary}>
                    Nova Sessão
                  </button>
                )}
                <button type="button" onClick={onSignout} className="text-sm text-gray-500 hover:text-gray-700">
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── REPOSITÓRIO ── */}
        {activeTab === "repo" && (
          <div className="space-y-4">
            <Card title="Indexar Repositório">
              <form onSubmit={onIndex} className="flex gap-3">
                <input
                  value={repositoryUrl}
                  onChange={e => setRepositoryUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git ou caminho local"
                  className={`${inputCls} flex-1`}
                />
                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? "⏳ Indexando…" : "📁 Indexar"}
                </button>
              </form>
            </Card>

            {repositoryId && (
              <Card title="Status do Repositório">
                <div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Repository ID</p>
                    <p className="font-mono text-sm text-gray-800">{repositoryId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge status={status || "pending"} />
                  </div>
                  <button onClick={onRefreshStatus} className={btnSecondary}>↻ Atualizar</button>
                  {status === "completed" && (
                    <span className="text-sm text-green-600 font-medium">✓ Pronto para uso</span>
                  )}
                </div>
                {repoError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-red-600 mb-0.5">Detalhes do erro:</p>
                    <p className="text-xs text-red-700 font-mono break-all">{repoError}</p>
                  </div>
                )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── CHAT ── */}
        {activeTab === "chat" && (
          <div className="space-y-4">
            <Card title="Perguntar sobre o código">
              {status !== "completed" ? (
                <p className="text-sm text-gray-500">
                  Indexe um repositório primeiro na aba <strong>Repositório</strong>.
                </p>
              ) : (
                <form onSubmit={onAsk} className="flex gap-3">
                  <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Ex: Como funciona o serviço de autenticação?"
                    className={`${inputCls} flex-1`}
                  />
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? "⏳ Processando…" : "💬 Perguntar"}
                  </button>
                </form>
              )}
            </Card>

            {chat && (
              <Card title="Resposta">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{chat.answer}</p>
                {chat.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fontes</p>
                    <div className="space-y-1">
                      {chat.sources.map(src => (
                        <div
                          key={src.chunk_id}
                          className="text-xs font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600"
                        >
                          {src.file_path}:{src.start_line}–{src.end_line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ── TOUR ── */}
        {activeTab === "tour" && (
          <div className="space-y-4">
            {status !== "completed" ? (
              <Card>
                <p className="text-sm text-gray-500">Indexe um repositório primeiro.</p>
              </Card>
            ) : !tour ? (
              <>
                <Card title="Configurar Tour">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Top-K módulos: <span className="text-indigo-600">{topK}</span>
                      </label>
                      <input
                        type="range" min={1} max={20} value={topK}
                        onChange={e => setTopK(Number(e.target.value))}
                        className="w-full mt-1 accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Peso complexidade: <span className="text-indigo-600">{complexityWeight.toFixed(2)}</span>
                      </label>
                      <input
                        type="range" min={0} max={1} step={0.05} value={complexityWeight}
                        onChange={e => setComplexityWeight(Number(e.target.value))}
                        className="w-full mt-1 accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Peso churn: <span className="text-indigo-600">{churnWeight.toFixed(2)}</span>
                      </label>
                      <input
                        type="range" min={0} max={1} step={0.05} value={churnWeight}
                        onChange={e => setChurnWeight(Number(e.target.value))}
                        className="w-full mt-1 accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Peso acoplamento: <span className="text-indigo-600">{couplingWeight.toFixed(2)}</span>
                      </label>
                      <input
                        type="range" min={0} max={1} step={0.05} value={couplingWeight}
                        onChange={e => setCouplingWeight(Number(e.target.value))}
                        className="w-full mt-1 accent-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${weightsValid ? "text-green-600" : "text-amber-600"}`}>
                      Soma dos pesos: {weightSum} {weightsValid ? "✓" : "(idealmente = 1.0)"}
                    </span>
                    <button onClick={onGenerateTour} disabled={loading} className={btnPrimary}>
                      {loading ? "⏳ Gerando…" : "🗺️ Gerar Tour"}
                    </button>
                  </div>
                </Card>

                {savedTours.length > 0 && (
                  <Card title="Tours Anteriores">
                    <div className="space-y-2">
                      {savedTours.map(t => (
                        <button
                          key={t.tour_id}
                          onClick={() => onOpenSavedTour(t.tour_id)}
                          className="w-full text-left flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{t.title}</p>
                            <p className="text-xs text-gray-500">
                              {t.step_count} passos{t.created_at ? ` · ${new Date(t.created_at).toLocaleString()}` : ""}
                            </p>
                          </div>
                          <span className="text-gray-400">→</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{tour.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">{tour.description}</p>
                  </div>
                  <button
                    onClick={() => setTour(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl ml-4 leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Passo {currentStep + 1} de {tour.step_count}</span>
                    <span>{Math.round(((currentStep + 1) / tour.step_count) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${((currentStep + 1) / tour.step_count) * 100}%` }}
                    />
                  </div>
                </div>

                {tour.steps[currentStep] && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">
                        {tour.steps[currentStep].title}
                      </h3>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        score: {tour.steps[currentStep].score.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Por que este módulo é importante
                      </p>
                      <p className="text-sm text-gray-700">{tour.steps[currentStep].rationale}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Recomendações de leitura
                      </p>
                      <ul className="space-y-1">
                        {tour.steps[currentStep].recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-indigo-400">•</span>{rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-500 font-medium">Métricas detalhadas</summary>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-lg border p-2">
                          <p className="text-lg font-bold text-gray-800">
                            {(tour.steps[currentStep].metrics.complexity["avg_complexity"] as number | undefined)?.toFixed(2) ?? "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">Complexidade</p>
                        </div>
                        <div className="bg-white rounded-lg border p-2">
                          <p className="text-lg font-bold text-gray-800">
                            {(tour.steps[currentStep].metrics.churn["total_commits"] as number | undefined) ?? 0}
                          </p>
                          <p className="text-xs text-gray-500">Commits</p>
                        </div>
                        <div className="bg-white rounded-lg border p-2">
                          <p className="text-lg font-bold text-gray-800">
                            {(tour.steps[currentStep].metrics.coupling["unique_dependencies"] as number | undefined) ?? 0}
                          </p>
                          <p className="text-xs text-gray-500">Dependências</p>
                        </div>
                      </div>
                    </details>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setCurrentStep(s => s - 1)}
                    disabled={currentStep === 0}
                    className={btnSecondary}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setCurrentStep(s => s + 1)}
                    disabled={!tour.steps[currentStep + 1]}
                    className={btnPrimary}
                  >
                    Próximo →
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── GRAFO ── */}
        {activeTab === "graph" && (
          <div className="space-y-4">
            {status !== "completed" ? (
              <Card>
                <p className="text-sm text-gray-500">Indexe um repositório primeiro.</p>
              </Card>
            ) : (
              <>
                <Card title="Grafo de Dependências">
                  <div className="flex gap-3 mb-4">
                    <button onClick={onLoadGraph} disabled={loading} className={btnPrimary}>
                      {loading ? "⏳ Carregando…" : "🔗 Carregar Grafo"}
                    </button>
                    {graph && (
                      <span className="text-sm text-gray-600 self-center">
                        <strong>{graph.node_count}</strong> módulos · <strong>{graph.edge_count}</strong> dependências
                      </span>
                    )}
                  </div>
                  {graph && (
                    <input
                      value={graphFilter}
                      onChange={e => setGraphFilter(e.target.value)}
                      placeholder="Filtrar módulos…"
                      className={inputCls}
                    />
                  )}
                </Card>

                {graph && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card title="Módulos">
                      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                        {filteredNodes.map(node => (
                          <div
                            key={node.id}
                            onClick={() => onSelectModule(node.module_path)}
                            className={`px-3 py-2.5 cursor-pointer hover:bg-indigo-50 transition-colors ${
                              selectedModule?.module_path === node.module_path
                                ? "bg-indigo-50 border-l-2 border-indigo-500"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{node.label}</p>
                                <p className="text-xs text-gray-500 font-mono">{node.module_path}</p>
                              </div>
                              <div className="text-xs text-gray-400 text-right">
                                <span>↙{node.metrics.in_degree}</span>{" "}
                                <span>↗{node.metrics.out_degree}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {selectedModule && (
                      <Card title={selectedModule.label}>
                        <p className="text-xs font-mono text-gray-500 mb-3">{selectedModule.module_path}</p>
                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-blue-700">{selectedModule.metrics.in_degree}</p>
                            <p className="text-xs text-blue-500">In</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-purple-700">{selectedModule.metrics.out_degree}</p>
                            <p className="text-xs text-purple-500">Out</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-gray-700">{selectedModule.metrics.total_degree}</p>
                            <p className="text-xs text-gray-500">Total</p>
                          </div>
                        </div>
                        {selectedModule.inbound_dependencies.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Depende deste módulo
                            </p>
                            <div className="space-y-1">
                              {selectedModule.inbound_dependencies.map((d, i) => (
                                <p key={i} className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                  {d.source} <span className="opacity-60">({d.type})</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedModule.outbound_dependencies.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Este módulo depende de
                            </p>
                            <div className="space-y-1">
                              {selectedModule.outbound_dependencies.map((d, i) => (
                                <p key={i} className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                                  {d.target} <span className="opacity-60">({d.type})</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {status !== "completed" ? (
              <Card>
                <p className="text-sm text-gray-500">Indexe um repositório primeiro.</p>
              </Card>
            ) : (
              <>
                <Card title="Timeline de Decisões">
                  <div className="flex gap-3 flex-wrap mb-3">
                    <input
                      value={timelineModule}
                      onChange={e => setTimelineModule(e.target.value)}
                      placeholder="Filtrar por módulo (opcional)"
                      className={`${inputCls} flex-1 min-w-40`}
                    />
                    <select
                      value={timelineCategory}
                      onChange={e => setTimelineCategory(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Todas categorias</option>
                      {["bugfix","feature","refactor","performance","documentation","test","infrastructure","dependency"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button onClick={onLoadTimeline} disabled={loading} className={btnPrimary}>
                      {loading ? "⏳" : "📜 Carregar"}
                    </button>
                  </div>
                  {timeline.length > 0 && (
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
                      {timeline.map(entry => (
                        <div key={entry.id} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              {entry.category}
                            </span>
                            <span className="text-xs text-gray-400">{entry.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-700">{entry.summary}</p>
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            {entry.commit_id.slice(0,8)} · confiança: {(entry.confidence*100).toFixed(0)}%
                            {entry.touched_modules.length > 0 ? ` · ${entry.touched_modules.join(", ")}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Por que este módulo mudou?">
                  <form onSubmit={onAskWhy} className="flex gap-3 flex-wrap mb-4">
                    <input
                      value={whyModule}
                      onChange={e => setWhyModule(e.target.value)}
                      placeholder="Caminho do módulo"
                      className={`${inputCls} flex-1 min-w-40`}
                    />
                    <input
                      value={whyQuestion}
                      onChange={e => setWhyQuestion(e.target.value)}
                      placeholder="Ex: por que tantos bugfixes?"
                      className={`${inputCls} flex-1 min-w-48`}
                    />
                    <button type="submit" disabled={loading || !whyModule || !whyQuestion} className={btnPrimary}>
                      🔍 Explicar
                    </button>
                  </form>
                  {whyResult && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{whyResult.explanation}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Confiança: {(whyResult.confidence*100).toFixed(0)}% · {whyResult.supporting_commits.length} commit(s)
                      </p>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── MÉTRICAS ── */}
        {activeTab === "metrics" && (
          <div className="space-y-4">
            {!repositoryId ? (
              <Card>
                <p className="text-sm text-gray-500">Indexe um repositório primeiro.</p>
              </Card>
            ) : (
              <>
                <div className="flex gap-3">
                  <button onClick={onLoadMetrics} disabled={loading} className={btnPrimary}>
                    📊 Métricas
                  </button>
                  <button onClick={onLoadQualityReport} disabled={loading} className={btnSecondary}>
                    📋 Relatório de Qualidade
                  </button>
                </div>

                {metricsData && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: "Utilidade",          value: `${(metricsData.answer_usefulness_rate*100).toFixed(0)}%` },
                      { label: "Corretude",           value: `${(metricsData.answer_correctness_rate*100).toFixed(0)}%` },
                      { label: "Latência P95",        value: `${metricsData.response_latency_p95.toFixed(2)}s` },
                      { label: "Conclusão de Fluxo",  value: `${(metricsData.onboarding_flow_completion_rate*100).toFixed(0)}%` },
                      { label: "Cobertura Feedback",  value: `${(metricsData.feedback_coverage_rate*100).toFixed(0)}%` },
                    ].map(m => (
                      <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <p className="text-2xl font-bold text-indigo-600">{m.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {qualityReport && (
                  <Card title="Relatório de Qualidade">
                    <div className="flex items-center gap-4 mb-3">
                      <Badge status={qualityReport.quality_label} />
                      <span className="text-2xl font-bold text-gray-800">
                        {(qualityReport.overall_quality_score*100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{qualityReport.summary}</p>
                  </Card>
                )}

                <Card title="Enviar Feedback">
                  <form onSubmit={onSubmitFeedback} className="space-y-3 max-w-lg">
                    <input
                      value={feedbackResponseId}
                      onChange={e => setFeedbackResponseId(e.target.value)}
                      placeholder="ID da resposta"
                      className={inputCls}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Utilidade: <span className="text-indigo-600">{feedbackUsefulness}</span>
                        </label>
                        <input
                          type="range" min={1} max={5} value={feedbackUsefulness}
                          onChange={e => setFeedbackUsefulness(Number(e.target.value))}
                          className="w-full mt-1 accent-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Corretude: <span className="text-indigo-600">{feedbackCorrectness}</span>
                        </label>
                        <input
                          type="range" min={1} max={5} value={feedbackCorrectness}
                          onChange={e => setFeedbackCorrectness(Number(e.target.value))}
                          className="w-full mt-1 accent-indigo-600"
                        />
                      </div>
                    </div>
                    <input
                      value={feedbackComment}
                      onChange={e => setFeedbackComment(e.target.value)}
                      placeholder="Comentário (opcional)"
                      className={inputCls}
                    />
                    <div className="flex items-center gap-3">
                      <button type="submit" disabled={!feedbackResponseId} className={btnPrimary}>
                        Enviar Feedback
                      </button>
                      {feedbackStatus && <span className="text-sm text-green-600">{feedbackStatus}</span>}
                    </div>
                  </form>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── OPERACIONAL ── */}
        {activeTab === "ops" && (
          <div className="space-y-4">
            <Card title="Status Operacional">
              <button onClick={onLoadOpsStatus} className={btnPrimary}>🔧 Verificar Status</button>
            </Card>

            {opsReadiness && (
              <Card title="Dependências">
                <div className="space-y-2">
                  {opsReadiness.dependencies.map(dep => (
                    <div
                      key={dep.name}
                      className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${dep.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-sm font-medium text-gray-800">{dep.name}</span>
                        {dep.message && <span className="text-xs text-gray-500">— {dep.message}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {dep.latency_ms !== null && (
                          <span className="text-xs text-gray-400">{dep.latency_ms}ms</span>
                        )}
                        <Badge status={dep.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {opsSummary && (
              <Card title="Resumo Operacional">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Uptime</p>
                    <p className="text-sm font-medium text-gray-800">{opsSummary.uptime_info}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Alertas</p>
                    <Badge status={opsSummary.alert_status} />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Métricas coletadas</p>
                    <p className="text-sm font-medium text-gray-800">{opsSummary.total_metric_points}</p>
                  </div>
                </div>
                {opsSummary.recent_errors.length > 0 && (
                  <details>
                    <summary className="text-sm font-medium text-gray-600 cursor-pointer">
                      Erros recentes ({opsSummary.recent_errors.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {opsSummary.recent_errors.map((err, i) => (
                        <div key={i} className="text-xs font-mono bg-red-50 text-red-700 px-2 py-1 rounded">
                          {err.name} — {err.timestamp}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </Card>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
