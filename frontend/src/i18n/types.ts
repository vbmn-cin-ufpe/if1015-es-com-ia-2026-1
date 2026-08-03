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
  debt_errLoadHistory: string;
  debt_errAnalyze: string;
  debt_avgScore: string;
  debt_criticalCount: string;
  debt_highCount: string;
  debt_avgCC: string;
  debt_avgChurn: string;
  debt_aiAnalysis: string;
  debt_aiLabel: string;
  debt_clickAnalyzePrefix: string;
  debt_clickAnalyzeSuffix: string;
  debt_evolution: string;
  debt_lastLabel: string;
  debt_noSnapshots: string;
  debt_trend_improving: string;
  debt_trend_degrading: string;
  debt_trend_stable: string;
  debt_waiting: string;
  debt_waitingSnapshots: string;
  debt_categoryTitle: string;
  debt_categoryScale: string;
  debt_categoryDataHint: string;
  debt_catComplexityDesc: string;
  debt_catChurn: string;
  debt_catChurnDesc: string;
  debt_catSize: string;
  debt_catSizeDesc: string;
  debt_catCouplingDesc: string;
  debt_catDocumentation: string;
  debt_catDocumentationDesc: string;
  debt_metricsTrend: string;
  debt_avgCyclomaticComplexity: string;
  debt_avgChurnPerFile: string;
  debt_commentRatio: string;
  debt_topFilesTitle: string;
  debt_lastSnapshotHint: string;
  debt_snapshotsHistory: string;
  debt_tableCritical: string;
  debt_tableAvgCC: string;
  debt_tableTrend: string;

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

  // ── Admin tab (extra) ─────────────────────────────────────────────────────
  admin_cancelBtn: string;
  admin_saveBtn: string;
  admin_savingBtn: string;
  admin_editBtn: string;
  admin_confirmBtn: string;
  admin_resetPasswordTitle: string;
  admin_saveFailed: string;
  admin_roleWord: string;
  admin_emailVerifiedLabel: string;
  admin_period: string;
  admin_daysOption: string;
  admin_errorLoading: string;
  admin_loadingCosts: string;
  admin_totalCostLabel: string;
  admin_callsLabel: string;
  admin_tokensInLabel: string;
  admin_monthlyProjection: string;
  admin_costByProvider: string;
  admin_dailyCost: string;
  admin_recentCalls: string;
  admin_endpointCol: string;
  admin_providerCol: string;
  admin_tokensInCol: string;
  admin_tokensOutCol: string;
  admin_costCol: string;
  admin_timeCol: string;
  admin_autoRefreshLabel: string;
  admin_queueSummary: string;
  admin_queueEmpty: string;
  admin_loadingPlans: string;
  admin_planUpdated: string;
  admin_maxRepos: string;
  admin_maxQuestions: string;
  admin_canDeleteRepos: string;
  admin_yes: string;
  admin_no: string;
  admin_editPlanTitle: string;
  admin_auditLogTitle: string;
  admin_auditLogDesc: string;
  admin_filterUserPlaceholder: string;
  admin_filterActionPlaceholder: string;
  admin_filterResourcePlaceholder: string;
  admin_auditLoadFailed: string;
  admin_auditEmpty: string;
  admin_dateTimeCol: string;
  admin_userCol: string;
  admin_actionCol: string;
  admin_resourceCol: string;
  admin_resourceIdCol: string;
  admin_ipCol: string;
  admin_resultsCount: string;
  admin_webhookErrorLoad: string;
  admin_webhookErrorCreate: string;
  admin_webhookConfirmRemove: string;
  admin_webhookErrorRemove: string;
  admin_webhookDesc: string;
  admin_createWebhookTitle: string;
  admin_repoIdPlaceholder: string;
  admin_repoUrlPlaceholder: string;
  admin_createBtn: string;
  admin_webhooksCount: string;
  admin_webhookEmpty: string;
  admin_active: string;
  admin_inactive: string;
  admin_webhookUrlLabel: string;
  admin_lastPush: string;
  admin_secretModalTitle: string;
  admin_secretModalDesc: string;
  admin_secretHmacLabel: string;
  admin_webhookUrlModalLabel: string;
  admin_webhookGithubInstructions: string;
  admin_webhookDoneBtn: string;
  admin_repoCol: string;
  admin_statusCol: string;
  admin_chunksCol: string;
  admin_updatedCol: string;
  admin_reposNotFound: string;
  admin_loadingUsage: string;
  admin_totalEvents: string;
  admin_uniqueSessions: string;
  admin_activeDays: string;
  admin_eventsByType: string;
  admin_dailyActivity: string;
  admin_eventsTooltip: string;
  admin_loadingFeedback: string;
  admin_noFeedbackDesc: string;
  admin_totalLabel: string;
  admin_positiveLabel: string;
  admin_negativeLabel: string;
  admin_positiveRate: string;
  admin_avgUsefulness: string;
  admin_avgCorrectness: string;
  admin_recentFeedback: string;
  admin_loadFailed: string;
  admin_userRemoved: string;
  admin_deleteUserFailed: string;
  admin_resetPwSent: string;
  admin_resetPwFailed: string;
  admin_userUpdated: string;
  admin_reposIndexedLabel: string;
  admin_questionsAskedLabel: string;
  admin_reloadTitle: string;
  admin_usersNotFound: string;
  admin_adjustFilters: string;
  admin_verifiedCol: string;
  admin_reposCol: string;
  admin_actionsCol: string;
  admin_planDistribution: string;
  admin_roleDistribution: string;

  // ── Repo tab (extra) ──────────────────────────────────────────────────────
  repo_indexTitle: string;
  repo_supported: string;
  repo_indexingBtn: string;
  repo_errorLabel: string;
  repo_indexFailHint: string;
  repo_statFiles: string;
  repo_statChunks: string;
  repo_statVectors: string;
  repo_statSize: string;
  repo_indexedAt: string;
  repo_updatedAt: string;
  repo_indexingTime: string;
  repo_languages: string;
  repo_exploreTitle: string;
  repo_refresh: string;
  repo_refreshFailed: string;
  repo_processing: string;
  repo_featureChat_desc: string;
  repo_featureTour_desc: string;
  repo_featureGraph_desc: string;
  repo_featureHistory_desc: string;
  repo_featureMetrics_desc: string;

  // ── Chat tab (extra) ──────────────────────────────────────────────────────
  chat_emptyTitle: string;
  chat_emptyDesc: string;
  chat_suggestion_1: string;
  chat_suggestion_2: string;
  chat_suggestion_3: string;
  chat_suggestion_4: string;
  chat_copied: string;
  chat_copy: string;
  chat_thinking: string;
  chat_sessionHint: string;
  chat_feedbackQuestion: string;
  chat_feedbackDesc: string;
  chat_feedbackThanks: string;
  chat_feedbackYes: string;
  chat_feedbackNo: string;

  // ── Tour tab (extra) ──────────────────────────────────────────────────────
  tour_topkRecommended: string;
  tour_selectionCriteria: string;
  tour_complexityLabel: string;
  tour_complexityDesc: string;
  tour_churnLabel: string;
  tour_churnDesc: string;
  tour_couplingLabel: string;
  tour_couplingDesc: string;
  tour_noviceTitle: string;
  tour_noviceDesc: string;
  tour_noviceBtn: string;
  tour_prevToursBtn: string;
  tour_weightsValid: string;
  tour_weightsInvalid: string;

  // ── Tour tab (viewer) ─────────────────────────────────────────────────────
  tour_badgeController: string;
  tour_badgeService: string;
  tour_badgeModel: string;
  tour_badgeUtil: string;
  tour_badgeCore: string;
  tour_badgeMiddleware: string;
  tour_badgeTest: string;
  tour_badgeInfra: string;
  tour_badgeModule: string;
  tour_hiddenLabel: string;
  tour_hiddenTitle: string;
  tour_filesCount: string;
  tour_deps: string;
  tour_metricsDiagnosis: string;
  tour_noRepoDesc: string;
  tour_noSavedTours: string;
  tour_closeTour: string;
  tour_moduleWord: string;
  tour_ofLabel: string;
  tour_percentComplete: string;
  tour_fileCountLabel: string;
  tour_scoreBreakdown: string;
  tour_scoreChurn: string;
  tour_scoreCoupling: string;
  tour_howToExplore: string;
  tour_explorerLabel: string;
  tour_moduleMetrics: string;
  tour_avgComplexity: string;
  tour_avgComplexityDesc: string;
  tour_totalCommits: string;
  tour_totalCommitsDesc: string;
  tour_uniqueDeps: string;
  tour_uniqueDepsDesc: string;
  tour_prevBtn: string;
  tour_nextBtn: string;
  tour_finishBtn: string;

  // ── Hotspots tab (extra) ──────────────────────────────────────────────────
  hotspots_analyzing: string;
  hotspots_refresh: string;
  hotspots_refreshing: string;
  hotspots_months: string;
  hotspots_filesScanned: string;
  hotspots_topN: string;
  hotspots_criticalCnt: string;
  hotspots_highRiskCnt: string;
  hotspots_langFilter: string;
  hotspots_minRisk: string;
  hotspots_allLangs: string;
  hotspots_mediumPlus: string;
  hotspots_highPlus: string;
  hotspots_clearFilter: string;
  hotspots_filesShown: string;
  hotspots_chartTitle: string;
  hotspots_chartHint: string;
  hotspots_rankTitle: string;
  hotspots_noFilesMatch: string;
  hotspots_commits: string;
  hotspots_criticalLegend: string;
  hotspots_highLegend: string;
  hotspots_mediumLegend: string;
  hotspots_lowLegend: string;

  // ── Search tab (extra) ────────────────────────────────────────────────────
  search_example_1: string;
  search_example_2: string;
  search_example_3: string;
  search_example_4: string;
  search_example_5: string;
  search_example_6: string;
  search_example_7: string;
  search_example_8: string;
  search_failedMsg: string;
}
