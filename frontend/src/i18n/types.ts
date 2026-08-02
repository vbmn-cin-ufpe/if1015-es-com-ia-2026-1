/**
 * i18n types — defines all translation keys used across the app.
 * Adding a key here enforces it exists in every locale file (TypeScript).
 */

export type Locale = 'pt-BR' | 'en-US' | 'es-MX';

export interface LocaleOption {
  code: Locale;
  label: string;
  flag: string;     // emoji flag
  shortLabel: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷', shortLabel: 'PT' },
  { code: 'en-US', label: 'English (US)',   flag: '🇺🇸', shortLabel: 'EN' },
  { code: 'es-MX', label: 'Español (MX)',   flag: '🇲🇽', shortLabel: 'ES' },
];

export interface Translations {
  // ── Navigation ────────────────────────────────────────────────────────────
  nav_repository: string;
  nav_chat: string;
  nav_tour: string;
  nav_graph: string;
  nav_impact: string;
  nav_search: string;
  nav_hotspots: string;
  nav_branch: string;
  nav_docs: string;
  nav_techDebt: string;
  nav_drift: string;
  nav_watchlist: string;
  nav_history: string;
  nav_metrics: string;
  nav_ops: string;
  nav_admin: string;

  // ── Header ────────────────────────────────────────────────────────────────
  header_darkMode: string;
  header_lightMode: string;
  header_signOut: string;
  header_collapse: string;
  header_expand: string;
  header_language: string;

  // ── Auth — general ────────────────────────────────────────────────────────
  auth_loginTitle: string;
  auth_signupTitle: string;
  auth_forgotTitle: string;
  auth_resetTitle: string;
  auth_email: string;
  auth_emailAccount: string;
  auth_password: string;
  auth_confirmPassword: string;
  auth_newPassword: string;
  auth_confirmNewPassword: string;
  auth_code6digits: string;
  auth_emailPlaceholder: string;
  auth_passwordPlaceholder: string;
  auth_newPasswordPlaceholder: string;
  auth_repeatPasswordPlaceholder: string;
  auth_repeatNewPasswordPlaceholder: string;
  auth_codePlaceholder: string;

  // ── Auth — buttons ────────────────────────────────────────────────────────
  auth_signInBtn: string;
  auth_createAccountBtn: string;
  auth_sendCodeBtn: string;
  auth_enterCodeBtn: string;
  auth_resetBtn: string;
  auth_continueBtn: string;
  auth_backToLogin: string;

  // ── Auth — loading states ─────────────────────────────────────────────────
  auth_enteringBtn: string;
  auth_creatingBtn: string;
  auth_sendingBtn: string;
  auth_resettingBtn: string;

  // ── Auth — links / dividers ───────────────────────────────────────────────
  auth_forgotPasswordLink: string;
  auth_hasAccount: string;
  auth_noAccount: string;
  auth_goToMyAccount: string;
  auth_createFreeAccount: string;
  auth_changePlan: string;

  // ── Auth — plan steps ────────────────────────────────────────────────────
  auth_planChoiceStep: string;
  auth_createAccountStep: string;
  auth_planLabel: string;

  // ── Auth — plan pricing ───────────────────────────────────────────────────
  auth_planFree_price: string;
  auth_planFree_priceLabel: string;
  auth_planPro_price: string;
  auth_planPro_priceLabel: string;
  auth_planEnterprise_price: string;
  auth_planEnterprise_priceLabel: string;

  // ── Auth — plan features ──────────────────────────────────────────────────
  auth_plan2Repos: string;
  auth_plan10Repos: string;
  auth_plan50Repos: string;
  auth_plan5Questions: string;
  auth_plan100Questions: string;
  auth_plan500Questions: string;
  auth_planCanDelete: string;

  // ── Auth — password strength ──────────────────────────────────────────────
  auth_pwStrength_1: string;
  auth_pwStrength_2: string;
  auth_pwStrength_3: string;
  auth_pwStrength_4: string;

  // ── Auth — forgot / reset messages ───────────────────────────────────────
  auth_codeSent: string;
  auth_codeDesc: string;
  auth_codeHint: string;
  auth_forgotDesc: string;
  auth_resetSuccess: string;
  auth_verifyNoticeTitle: string;
  auth_verifyNoticeDesc: string;
  auth_resendEmail: string;
  auth_resendingBtn: string;
  auth_emailVerifiedTitle: string;
  auth_emailVerifiedDesc: string;
  auth_goToApp: string;

  // ── Auth — errors ─────────────────────────────────────────────────────────
  auth_err_invalidCredentials: string;
  auth_err_signupFailed: string;
  auth_err_passwordsNoMatch: string;
  auth_err_passwordTooShort: string;
  auth_err_newPasswordTooShort: string;
  auth_err_sendCodeFailed: string;
  auth_err_invalidCode: string;

  // ── Auth — verify email page ──────────────────────────────────────────────
  auth_verifyingEmail: string;
  auth_verifyFailed: string;
  auth_goToLogin: string;

  // ── Quota sidebar ─────────────────────────────────────────────────────────
  quota_repos: string;
  quota_questions: string;

  // ── Repo tab ──────────────────────────────────────────────────────────────
  repo_urlPlaceholder: string;
  repo_tokenPlaceholder: string;
  repo_indexBtn: string;
  repo_reindexBtn: string;
  repo_deleteBtn: string;
  repo_deleting: string;
  repo_indexing: string;
  repo_statusQueued: string;
  repo_statusCloning: string;
  repo_statusDetecting: string;
  repo_statusChunking: string;
  repo_statusEmbedding: string;
  repo_statusStoring: string;
  repo_statusCompleted: string;
  repo_statusFailed: string;

  // ── Common ────────────────────────────────────────────────────────────────
  common_loading: string;
  common_noRepoTitle: string;
  common_noRepoDesc: string;
  common_language: string;
  common_copy: string;
  common_copied: string;
  common_refresh: string;
  common_analyze: string;
  common_analyzing: string;
  common_export: string;
  common_search: string;
  common_searching: string;
  common_add: string;
  common_remove: string;
  common_clear: string;
  common_tryAgain: string;
  common_error: string;
  common_high: string;
  common_medium: string;
  common_low: string;
  common_minimal: string;
  common_critical: string;
  common_complexity: string;
  common_files: string;
  common_modules: string;
  common_commits: string;
  common_lines: string;
  common_today: string;
  common_yesterday: string;

  // ── Chat tab ──────────────────────────────────────────────────────────────
  chat_title: string;
  chat_subtitle: string;
  chat_inputPlaceholder: string;
  chat_sendBtn: string;
  chat_clearBtn: string;
  chat_clearTitle: string;
  chat_thinking_1: string;
  chat_thinking_2: string;
  chat_thinking_3: string;
  chat_thinking_4: string;
  chat_thinking_5: string;
  chat_sessionQuestion: string;
  chat_sessionQuestions: string;
  chat_errorMsg: string;
  chat_codeLabel: string;

  // ── Tour tab ──────────────────────────────────────────────────────────────
  tour_title: string;
  tour_subtitle: string;
  tour_configTitle: string;
  tour_configSubtitle: string;
  tour_configDesc: string;
  tour_topkLabel: string;
  tour_generateBtn: string;
  tour_generating: string;
  tour_loadingHint: string;
  tour_moduleNav: string;
  tour_whyImportant: string;
  tour_codeAnalysis: string;
  tour_aiLabel: string;
  tour_metricsToggle_show: string;
  tour_metricsToggle_hide: string;
  tour_metricsLabel: string;
  tour_llmHint: string;
  tour_noFiles: string;
  tour_complexity: string;
  tour_commits: string;
  tour_critical: string;
  tour_errGenerate: string;
  tour_errLoad: string;

  // ── Graph tab ─────────────────────────────────────────────────────────────
  graph_title: string;
  graph_subtitle: string;
  graph_filterPlaceholder: string;
  graph_reload: string;
  graph_centerView: string;
  graph_overview: string;
  graph_loadError: string;
  graph_notAvailable: string;
  graph_checkFiles: string;
  graph_calculating: string;
  graph_loadingDetails: string;
  graph_intermediate: string;
  graph_output: string;
  graph_input: string;
  graph_whoUses: string;
  graph_usedBy: string;
  graph_connections: string;
  graph_connection: string;
  graph_modulesCount: string;
  graph_depsCount: string;

  // ── Search tab ────────────────────────────────────────────────────────────
  search_title: string;
  search_subtitle: string;
  search_placeholder: string;
  search_btn: string;
  search_searching: string;
  search_recentTitle: string;
  search_examplesTitle: string;
  search_clearHistory: string;
  search_relevanceHigh: string;
  search_relevanceMedium: string;
  search_relevanceLow: string;
  search_copyPath: string;
  search_copyCode: string;
  search_askInChat: string;
  search_snippet: string;
  search_snippets: string;
  search_noRepoDesc: string;

  // ── Impact tab ────────────────────────────────────────────────────────────
  impact_title: string;
  impact_subtitle: string;
  impact_searchPlaceholder: string;
  impact_loading: string;
  impact_noModules: string;
  impact_dependOn: string;
  impact_uses: string;
  impact_recent: string;
  impact_mostImpactful: string;
  impact_moreModules: string;

  // ── Hotspots tab ──────────────────────────────────────────────────────────
  hotspots_title: string;
  hotspots_subtitle: string;
  hotspots_riskZone: string;
  hotspots_dragFilter: string;
  hotspots_xAxis: string;
  hotspots_yAxis: string;
  hotspots_loadError: string;
  hotspots_language: string;
  hotspots_score: string;

  // ── Branch tab ────────────────────────────────────────────────────────────
  branch_title: string;
  branch_subtitle: string;
  branch_analyzeBtn: string;
  branch_inputLabel: string;
  branch_inputPlaceholder: string;
  branch_baseLabel: string;
  branch_quickBranches: string;
  branch_allBranches: string;
  branch_searchPlaceholder: string;
  branch_loading: string;
  branch_noBranches: string;
  branch_total: string;
  branch_tabSummary: string;
  branch_tabFiles: string;
  branch_tabDiff: string;
  branch_tabRisk: string;
  branch_mergeRisk: string;
  branch_filesChanged: string;
  branch_linesAdded: string;
  branch_linesRemoved: string;
  branch_modulesTouched: string;
  branch_noDiff: string;
  branch_noRepoDesc: string;

  // ── Doc Generator tab ─────────────────────────────────────────────────────
  doc_title: string;
  doc_subtitle: string;
  doc_inputLabel: string;
  doc_inputPlaceholder: string;
  doc_generateBtn: string;
  doc_generating: string;
  doc_loadingHint: string;
  doc_copyMarkdown: string;
  doc_noRepoDesc: string;

  // ── Tech Debt tab ─────────────────────────────────────────────────────────
  debt_title: string;
  debt_subtitle: string;
  debt_analyzeBtn: string;
  debt_analyzing: string;
  debt_refreshBtn: string;
  debt_exportBtn: string;
  debt_noRepoDesc: string;
  debt_avgScore: string;
  debt_criticalCount: string;
  debt_highCount: string;
  debt_avgCC: string;
  debt_avgChurn: string;
  debt_aiAnalysis: string;
  debt_aiLabel: string;
  debt_clickAnalyze: string;
  debt_evolution: string;
  debt_lastLabel: string;
  debt_noSnapshots: string;
  debt_trend_improving: string;
  debt_trend_degrading: string;
  debt_trend_stable: string;
  debt_waiting: string;
  debt_waitingSnapshots: string;

  // ── Drift tab ─────────────────────────────────────────────────────────────
  drift_title: string;
  drift_subtitle: string;
  drift_selectTitle: string;
  drift_snapshotA: string;
  drift_snapshotB: string;
  drift_compareBtn: string;
  drift_interpretBtn: string;
  drift_interpreting: string;
  drift_interpretTitle: string;
  drift_sameSnapshotWarning: string;
  drift_snapshotsList: string;
  drift_noRepoDesc: string;
  drift_dateHint: string;
  drift_navHint: string;
  drift_nodesAdded: string;
  drift_nodesRemoved: string;
  drift_edgesAdded: string;
  drift_edgesRemoved: string;
  drift_noNodeChanges: string;
  drift_noEdgeChanges: string;
  drift_tableId: string;
  drift_tableDate: string;
  drift_tableNodes: string;
  drift_tableEdges: string;
  drift_added: string;
  drift_removed: string;
  drift_unchanged: string;

  // ── Watchlist tab ─────────────────────────────────────────────────────────
  watch_title: string;
  watch_subtitle: string;
  watch_refreshBtn: string;
  watch_watchCurrent: string;
  watch_fullRepo: string;
  watch_customPlaceholder: string;
  watch_addBtn: string;
  watch_currentList: string;
  watch_fullRepoLabel: string;
  watch_allWatchlist: string;
  watch_emptyState: string;
  watch_following: string;
  watch_follow: string;

  // ── History tab ───────────────────────────────────────────────────────────
  history_title: string;
  history_subtitle: string;
  history_aiTitle: string;
  history_aiDesc: string;
  history_aiPlaceholder: string;
  history_explainBtn: string;
  history_analyzing: string;
  history_noModules: string;
  history_confidence: string;
  history_supporting: string;

  // ── Metrics tab ───────────────────────────────────────────────────────────
  metrics_title: string;
  metrics_subtitle: string;
  metrics_loading: string;
  metrics_noRepo: string;
  metrics_periodSummary: string;
  metrics_overallScore: string;
  metrics_updatedAt: string;
  metrics_higherBetter: string;
  metrics_lowerBetter: string;

  // ── Ops tab ───────────────────────────────────────────────────────────────
  ops_title: string;
  ops_subtitle: string;
  ops_updatedAt: string;
  ops_autoRefresh: string;
  ops_refresh: string;
  ops_requests: string;
  ops_totalErrors: string;
  ops_metricPoints: string;
  ops_depsOk: string;
  ops_dependencies: string;
  ops_healthy: string;
  ops_attention: string;
  ops_degraded: string;
  ops_error: string;
  ops_unknown: string;
  ops_verifying: string;
  ops_endpoints: string;

  // ── Admin tab ─────────────────────────────────────────────────────────────
  admin_title: string;
  admin_subtitle: string;
  admin_users: string;
  admin_repoHealth: string;
  admin_usage: string;
  admin_llmQuality: string;
  admin_llmCosts: string;
  admin_queue: string;
  admin_plans: string;
  admin_audit: string;
  admin_webhooks: string;
  admin_loadingRepos: string;
  admin_noFeedback: string;
  admin_editUser: string;
  admin_totalUsers: string;
  admin_searchEmail: string;
  admin_allPlans: string;
  admin_allRoles: string;
  admin_loadingUsers: string;

  // ── Repo tab (extra) ──────────────────────────────────────────────────────
  repo_indexTitle: string;
  repo_supported: string;
  repo_indexingBtn: string;
  repo_errorLabel: string;
  repo_indexFailHint: string;
}
