// ============================================
// Notification Names (Application Events)
// ============================================

export const AppNotes = {
  // Startup
  STARTUP: 'startup',
  GAME_CONFIG_LOADED: 'gameConfigLoaded',

  // Auth
  LOGIN: 'login',
  LOGIN_SUCCESS: 'loginSuccess',
  LOGIN_FAILED: 'loginFailed',
  REGISTER: 'register',
  REGISTER_SUCCESS: 'registerSuccess',
  REGISTER_FAILED: 'registerFailed',
  LOGOUT: 'logout',

  // Game Flow
  GAME_START: 'gameStart',
  LAUNCH_REQUEST: 'launchRequest',
  LAUNCH_RESULT: 'launchResult',
  SHOOT_REQUEST: 'shootRequest',
  SHOOT_RESULT: 'shootResult',
  BALANCE_UPDATED: 'balanceUpdated',
  BET_CHANGED: 'betChanged',

  // UI
  SHOW_LOGIN: 'showLogin',
  SHOW_GAME: 'showGame',
  SHOW_ADMIN: 'showAdmin',
  SHOW_HISTORY: 'showHistory',
  SHOW_SETTINGS: 'showSettings',
  SHOW_HELP: 'showHelp',
  TOGGLE_MENU: 'toggleMenu',
  TOGGLE_AUTO_PANEL: 'toggleAutoPanel',
  UI_ERROR: 'uiError',

  // Admin
  ADMIN_LOAD_PLAYERS: 'adminLoadPlayers',
  ADMIN_PLAYERS_LOADED: 'adminPlayersLoaded',
  ADMIN_LOAD_REPORTS: 'adminLoadReports',
  ADMIN_REPORTS_LOADED: 'adminReportsLoaded',
} as const;
