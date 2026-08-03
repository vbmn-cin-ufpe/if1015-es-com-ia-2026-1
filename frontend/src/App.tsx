import { useState, useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    pageVariants, pageTransition,
    sidebarVariants, sidebarTransition,
} from "./animations";
import { signout, getMe, verifyEmail } from "./services/authApi";
import { useAuthStore } from "./store/authStore";
import { useUiStore } from "./store/uiStore";
import { useI18n } from "./i18n";
import type { Translations } from "./i18n";
import { AuthPage } from "./components/auth/AuthPage";
import { RepoTab } from "./components/tabs/RepoTab";
import { ChatTab } from "./components/tabs/ChatTab";
import { TourTab } from "./components/tabs/TourTab";
import { GraphTab } from "./components/tabs/GraphTab";
import { HistoryTab } from "./components/tabs/HistoryTab";
import { MetricsTab } from "./components/tabs/MetricsTab";
import { OpsTab } from "./components/tabs/OpsTab";
import { SearchTab } from "./components/tabs/SearchTab";
import { ImpactTab } from "./components/tabs/ImpactTab";
import { AdminTab } from "./components/tabs/AdminTab";
import { HotspotsTab } from "./components/tabs/HotspotsTab";
import { BranchAnalysisTab } from "./components/tabs/BranchAnalysisTab";
import { DocGeneratorTab } from "./components/tabs/DocGeneratorTab";
import { TechDebtTab } from "./components/tabs/TechDebtTab";
import { DriftTab } from "./components/tabs/DriftTab";
import { WatchlistTab } from "./components/tabs/WatchlistTab";
import {
    Badge,
    btnPrimary,
    btnSecondary,
    Icon,
    LanguageSelector,
} from "./components/ui";

const TABS: { path: string; labelKey: keyof Translations; icon: string; adminOnly?: true }[] = [
    { path: "/",          labelKey: "nav_repository", icon: "folder-open" },
    { path: "/chat",      labelKey: "nav_chat",       icon: "comments" },
    { path: "/tour",      labelKey: "nav_tour",       icon: "route" },
    { path: "/graph",     labelKey: "nav_graph",      icon: "diagram-project" },
    { path: "/impact",    labelKey: "nav_impact",     icon: "circle-nodes" },
    { path: "/search",    labelKey: "nav_search",     icon: "magnifying-glass" },
    { path: "/hotspots",  labelKey: "nav_hotspots",   icon: "fire" },
    { path: "/branch",    labelKey: "nav_branch",     icon: "code-branch" },
    { path: "/docs",      labelKey: "nav_docs",       icon: "book-open" },
    { path: "/tech-debt", labelKey: "nav_techDebt",   icon: "bug" },
    { path: "/drift",     labelKey: "nav_drift",      icon: "code-compare" },
    { path: "/watchlist", labelKey: "nav_watchlist",  icon: "bell" },
    { path: "/history",   labelKey: "nav_history",    icon: "clock-rotate-left" },
    { path: "/metrics",   labelKey: "nav_metrics",    icon: "chart-bar" },
    { path: "/ops",       labelKey: "nav_ops",        icon: "server",        adminOnly: true },
    { path: "/admin",     labelKey: "nav_admin",      icon: "shield-halved", adminOnly: true },
];

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
    free:       { label: "Free",       color: "text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400" },
    paid:       { label: "Pro",        color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300" },
    enterprise: { label: "Enterprise", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300" },
};

export default function App() {
    return (
        <BrowserRouter>
            <AppRoot />
        </BrowserRouter>
    );
}

function AppRoot() {
    const token = useAuthStore((s) => s.token);
    const location = useLocation();

    // Email verification link works regardless of auth state
    if (location.pathname === "/verify-email") return <VerifyEmailPage />;

    if (!token) return <AuthPage />;
    return <AppShell />;
}

// ── Email verification page ───────────────────────────────────────────────────

function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const { updateUser } = useAuthStore();
    const navigate = useNavigate();
    const [state, setState] = useState<"loading" | "success" | "error">("loading");
    const [msg, setMsg] = useState("");

    useEffect(() => {
        if (!token) {
            setState("error");
            setMsg("Token de verificação não encontrado na URL.");
            return;
        }
        verifyEmail(token)
            .then(() => {
                setState("success");
                setMsg("E-mail verificado com sucesso!");
                updateUser({ email_verified: true });
            })
            .catch(() => {
                setState("error");
                setMsg("Token inválido ou expirado. Solicite um novo e-mail de verificação.");
            });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-3xl" />
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="relative w-full max-w-sm"
            >
                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 mb-3">
                        <Icon name="compass" className="text-white text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">CodeCompass</h1>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
                    <AnimatePresence mode="wait">
                    {state === "loading" && (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-center space-y-4 py-4">
                            <Icon name="spinner" className="text-indigo-500 text-4xl animate-spin" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Verificando seu e-mail…</p>
                        </motion.div>
                    )}
                    {state === "success" && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto">
                                <Icon name="circle-check" className="text-emerald-500 text-3xl" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">E-mail confirmado!</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{msg}</p>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Sua conta está ativa. Você pode acessar todas as funcionalidades do CodeCompass.
                            </p>
                            <button onClick={() => navigate("/")} className={btnPrimary + " w-full justify-center mt-2"}>
                                <Icon name="house" /> Ir para o app
                            </button>
                        </motion.div>
                    )}
                    {state === "error" && (
                        <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center mx-auto">
                                <Icon name="circle-xmark" className="text-red-500 text-3xl" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">Falha na verificação</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{msg}</p>
                            </div>
                            <button onClick={() => navigate("/")} className={btnPrimary + " w-full justify-center mt-2"}>
                                <Icon name="arrow-right-to-bracket" /> Ir para login
                            </button>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

function AppShell(): JSX.Element {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, token, clear, updateUser } = useAuthStore();
    const { darkMode, toggleDark } = useUiStore();
    const { t } = useI18n();
    const [repositoryId, setRepositoryId] = useState("");
    const [status, setStatus] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Refresh quota counters from backend on every mount / token change
    useEffect(() => {
        if (!token) return;
        getMe(token)
            .then((me) => updateUser({
                repos_indexed_count: me.repos_indexed_count,
                questions_asked_count: me.questions_asked_count,
                email_verified: me.email_verified,
                role: me.role,
                plan: me.plan,
            }))
            .catch(() => {}); // token might be expired — signout handled elsewhere
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    async function onSignout() {
        if (token) await signout(token).catch(() => {});
        clear();
    }

    const isAdmin = user?.role === "admin";
    const planInfo = PLAN_BADGE[user?.plan ?? "free"];

    const visibleTabs = TABS.filter((t) => !("adminOnly" in t && t.adminOnly) || isAdmin);

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 font-sans overflow-hidden">
            {/* ── Header ── */}
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
                <div className="px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <Icon name="compass" className="text-indigo-600 dark:text-indigo-400 text-2xl select-none" />
                            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">CodeCompass</span>
                        </button>
                        {repositoryId && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded hidden sm:inline">
                                {repositoryId.slice(0, 8)}…
                            </span>
                        )}
                        {status && <Badge status={status} />}
                    </div>

                    <div className="flex items-center gap-2">
                        <LanguageSelector />
                        <button
                            onClick={toggleDark}
                            title={darkMode ? t('header_lightMode') : t('header_darkMode')}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base"
                        >
                            <Icon name={darkMode ? "sun" : "moon"} />
                        </button>

                        {/* User info + plan badge */}
                        {user && (
                            <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-1.5">
                                    <Icon name="circle-user" className="text-gray-400 dark:text-gray-500" />
                                    <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[140px] truncate">
                                        {user.email}
                                    </span>
                                </div>
                                {planInfo && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planInfo.color}`}>
                                        {planInfo.label}
                                    </span>
                                )}
                                {isAdmin && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                        Admin
                                    </span>
                                )}
                                {!user.email_verified && (
                                    <span title="E-mail não verificado" className="text-amber-500 text-sm">
                                        <Icon name="triangle-exclamation" />
                                    </span>
                                )}
                                <button onClick={onSignout} className={btnSecondary + " text-xs"}>
                                    <Icon name="right-from-bracket" /> {t('header_signOut')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Body: sidebar + content ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <motion.aside
                    animate={sidebarVariants(sidebarOpen)}
                    transition={sidebarTransition}
                    className="flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    {/* Nav items */}
                    <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto overflow-x-hidden">
                        {visibleTabs.map((tab) => (
                            <NavLink
                                key={tab.path}
                                to={tab.path}
                                end={tab.path === "/"}
                                title={!sidebarOpen ? t(tab.labelKey) : undefined}
                                className={({ isActive }) =>
                                    "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors " +
                                    (isActive
                                        ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100")
                                }
                            >
                                <Icon name={tab.icon} className="flex-shrink-0 w-5 text-center" />
                                {sidebarOpen && <span className="truncate">{t(tab.labelKey)}</span>}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User quota mini-bar (sidebar bottom) */}
                    {sidebarOpen && user && (
                        <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                            <QuotaBar
                                icon="folder-open"
                                label={t('quota_repos')}
                                used={user.repos_indexed_count}
                                max={user.plan === "enterprise" ? 50 : user.plan === "paid" ? 10 : 2}
                                admin={isAdmin}
                            />
                            <QuotaBar
                                icon="comments"
                                label={t('quota_questions')}
                                used={user.questions_asked_count}
                                max={user.plan === "enterprise" ? 500 : user.plan === "paid" ? 100 : 5}
                                admin={isAdmin}
                            />
                        </div>
                    )}

                    {/* Collapse button */}
                    <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700">
                        <motion.button
                            whileHover={{ backgroundColor: "rgba(99,102,241,0.08)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSidebarOpen((o) => !o)}
                            className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title={sidebarOpen ? t('header_collapse') : t('header_expand')}
                        >
                            <motion.span
                                animate={{ rotate: sidebarOpen ? 0 : 180 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                            >
                                <Icon name="chevron-left" />
                            </motion.span>
                            <AnimatePresence>
                            {sidebarOpen && (
                                <motion.span
                                    key="sidebar-label"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    {t('header_collapse')}
                                </motion.span>
                            )}
                            </AnimatePresence>
                        </motion.button>
                    </div>
                </motion.aside>

                {/* Main content */}
                <main className="flex-1 overflow-auto px-6 py-6">
                    <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<PageTransition><RepoTab repositoryId={repositoryId} status={status} onIndexed={(id, s) => { setRepositoryId(id); setStatus(s); }} /></PageTransition>} />
                        <Route path="/chat"     element={<PageTransition><ChatTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/tour"     element={<PageTransition><TourTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/graph"    element={<PageTransition><GraphTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/impact"   element={<PageTransition><ImpactTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/search"   element={<PageTransition><SearchTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/hotspots"  element={<PageTransition><HotspotsTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/branch"    element={<PageTransition><BranchAnalysisTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/docs"      element={<PageTransition><DocGeneratorTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/tech-debt" element={<PageTransition><TechDebtTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/drift"     element={<PageTransition><DriftTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/watchlist" element={<PageTransition><WatchlistTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/history"   element={<PageTransition><HistoryTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        <Route path="/metrics"  element={<PageTransition><MetricsTab repositoryId={repositoryId} status={status} /></PageTransition>} />
                        {isAdmin && <Route path="/ops"   element={<PageTransition><OpsTab /></PageTransition>} />}
                        {isAdmin && <Route path="/admin" element={<PageTransition><AdminTab /></PageTransition>} />}
                        <Route path="*" element={<PageTransition><RepoTab repositoryId={repositoryId} status={status} onIndexed={(id, s) => { setRepositoryId(id); setStatus(s); }} /></PageTransition>} />
                    </Routes>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

// ── Quota mini-bar ────────────────────────────────────────────────────────────

function QuotaBar({ icon, label, used, max, admin }: { icon: string; label: string; used: number; max: number; admin: boolean }) {
    const pct = admin ? 0 : Math.min((used / max) * 100, 100);
    const color = admin ? "bg-amber-400" : pct >= 100 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-indigo-400";
    return (
        <div>
            <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Icon name={icon} className="text-[9px]" /> {label}
                </span>
                <span className="text-[10px] text-gray-400">
                    {admin ? "∞" : `${used}/${max}`}
                </span>
            </div>
            {!admin && (
                <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full ${color}`}
                    />
                </div>
            )}
        </div>
    );
}

// ── PageTransition ────────────────────────────────────────────────────────────

function PageTransition({ children }: { children: ReactNode }) {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={pageTransition}
            className="min-h-full"
        >
            {children}
        </motion.div>
    );
}

