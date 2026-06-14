import { FormEvent, useState, useEffect } from "react";
import {
    signin,
    signup,
    signout,
    listSessions,
    createSession,
    type SessionInfo,
} from "./services/authApi";
import { RepoTab } from "./components/tabs/RepoTab";
import { ChatTab } from "./components/tabs/ChatTab";
import { TourTab } from "./components/tabs/TourTab";
import { GraphTab } from "./components/tabs/GraphTab";
import { HistoryTab } from "./components/tabs/HistoryTab";
import { MetricsTab } from "./components/tabs/MetricsTab";
import { OpsTab } from "./components/tabs/OpsTab";
import {
    Badge,
    inputCls,
    btnPrimary,
    btnSecondary,
    Icon,
} from "./components/ui";

type Tab = "repo" | "chat" | "tour" | "graph" | "history" | "metrics" | "ops";

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "repo", label: "Repositório", icon: "folder-open" },
    { id: "chat", label: "Chat", icon: "comments" },
    { id: "tour", label: "Tour", icon: "route" },
    { id: "graph", label: "Grafo", icon: "diagram-project" },
    { id: "history", label: "Histórico", icon: "clock-rotate-left" },
    { id: "metrics", label: "Métricas", icon: "chart-bar" },
    { id: "ops", label: "Operacional", icon: "server" },
];

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>("repo");
    const [repositoryId, setRepositoryId] = useState("");
    const [status, setStatus] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authUser, setAuthUser] = useState<{
        user_id: string;
        email: string;
    } | null>(null);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [authError, setAuthError] = useState("");
    const [authOpen, setAuthOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [darkMode, setDarkMode] = useState(
        () => localStorage.getItem("darkMode") === "true",
    );

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("darkMode", "true");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("darkMode", "false");
        }
    }, [darkMode]);

    async function onSignin(e: FormEvent) {
        e.preventDefault();
        setAuthError("");
        try {
            const r = await signin(authEmail, authPassword);
            setAuthToken(r.token);
            setAuthUser({ user_id: r.user_id, email: r.email });
            setAuthPassword("");
            setSessions(await listSessions(r.token));
            setAuthOpen(false);
        } catch {
            setAuthError("Credenciais inválidas");
        }
    }

    async function onSignup(e: FormEvent) {
        e.preventDefault();
        setAuthError("");
        try {
            const r = await signup(authEmail, authPassword);
            setAuthToken(r.token);
            setAuthUser({ user_id: r.user_id, email: r.email });
            setAuthPassword("");
            setAuthOpen(false);
        } catch {
            setAuthError("Falha no cadastro");
        }
    }

    async function onSignout() {
        if (authToken) await signout(authToken).catch(() => {});
        setAuthToken("");
        setAuthUser(null);
        setSessions([]);
    }

    async function onCreateSession() {
        if (!authToken || !repositoryId) return;
        try {
            await createSession(authToken, repositoryId);
            setSessions(await listSessions(authToken));
        } catch {}
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 font-sans overflow-hidden">
            {/* ── Header ── */}
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
                <div className="px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon
                            name="compass"
                            className="text-indigo-600 dark:text-indigo-400 text-2xl select-none"
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            CodeCompass
                        </span>
                        {repositoryId && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded hidden sm:inline">
                                {repositoryId.slice(0, 8)}…
                            </span>
                        )}
                        {status && <Badge status={status} />}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Dark mode toggle */}
                        <button
                            onClick={() => setDarkMode((d) => !d)}
                            title={darkMode ? "Modo claro" : "Modo escuro"}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base"
                        >
                            {darkMode ? (
                                <Icon name="sun" />
                            ) : (
                                <Icon name="moon" />
                            )}
                        </button>

                        {authUser ? (
                            <>
                                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                                    {authUser.email}
                                </span>
                                {repositoryId && (
                                    <button
                                        onClick={onCreateSession}
                                        className={btnSecondary + " text-xs"}
                                    >
                                        <Icon name="plus" /> Sessão
                                    </button>
                                )}
                                <button
                                    onClick={onSignout}
                                    className={btnSecondary + " text-xs"}
                                >
                                    <Icon name="right-from-bracket" /> Sair
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setAuthOpen((o) => !o)}
                                className={btnSecondary + " text-xs"}
                            >
                                <Icon name="right-to-bracket" /> Entrar
                            </button>
                        )}
                    </div>
                </div>

                {/* Auth dropdown */}
                {authOpen && !authUser && (
                    <div className="absolute right-4 top-14 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-5 z-30">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
                            Entrar / Criar conta
                        </h3>
                        <form className="space-y-3">
                            <input
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                placeholder="Email"
                                type="email"
                                className={inputCls}
                            />
                            <input
                                value={authPassword}
                                onChange={(e) =>
                                    setAuthPassword(e.target.value)
                                }
                                placeholder="Senha"
                                type="password"
                                className={inputCls}
                            />
                            {authError && (
                                <p className="text-xs text-red-500">
                                    {authError}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    onClick={onSignin}
                                    className={
                                        btnPrimary + " flex-1 justify-center"
                                    }
                                >
                                    Entrar
                                </button>
                                <button
                                    type="button"
                                    onClick={onSignup}
                                    className={
                                        btnSecondary + " flex-1 justify-center"
                                    }
                                >
                                    Cadastrar
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </header>

            {/* ── Body: sidebar + content ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={
                        "flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-200 overflow-hidden " +
                        (sidebarOpen ? "w-52" : "w-14")
                    }
                >
                    {/* Nav items */}
                    <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto overflow-x-hidden">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                title={!sidebarOpen ? tab.label : undefined}
                                className={
                                    "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors " +
                                    (activeTab === tab.id
                                        ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100")
                                }
                            >
                                <Icon
                                    name={tab.icon}
                                    className="flex-shrink-0 w-5 text-center"
                                />
                                {sidebarOpen && (
                                    <span className="truncate">
                                        {tab.label}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Collapse/expand button at bottom */}
                    <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setSidebarOpen((o) => !o)}
                            className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title={
                                sidebarOpen
                                    ? "Recolher sidebar"
                                    : "Expandir sidebar"
                            }
                        >
                            {sidebarOpen ? (
                                <Icon name="chevron-left" />
                            ) : (
                                <Icon name="chevron-right" />
                            )}
                            {sidebarOpen && <span>Recolher</span>}
                        </button>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-auto px-6 py-6">
                    {activeTab === "repo" && (
                        <RepoTab
                            repositoryId={repositoryId}
                            status={status}
                            onIndexed={(id, s) => {
                                setRepositoryId(id);
                                setStatus(s);
                            }}
                        />
                    )}
                    {activeTab === "chat" && (
                        <ChatTab repositoryId={repositoryId} status={status} />
                    )}
                    {activeTab === "tour" && (
                        <TourTab repositoryId={repositoryId} status={status} />
                    )}
                    {activeTab === "graph" && (
                        <GraphTab repositoryId={repositoryId} status={status} />
                    )}
                    {activeTab === "history" && (
                        <HistoryTab
                            repositoryId={repositoryId}
                            status={status}
                        />
                    )}
                    {activeTab === "metrics" && (
                        <MetricsTab
                            repositoryId={repositoryId}
                            status={status}
                        />
                    )}
                    {activeTab === "ops" && <OpsTab />}
                </main>
            </div>
        </div>
    );
}
