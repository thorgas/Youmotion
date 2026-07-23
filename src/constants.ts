const literal = <Value extends string>(value: Value) => value;

export const EMOTION_IDS = Object.freeze({
  JOY: literal('freude'),
  LOVE: literal('liebe'),
  SHAME: literal('scham'),
  DISGUST: literal('ekel'),
  SADNESS: literal('trauer'),
  ANGER: literal('wut'),
  FEAR: literal('furcht'),
});

export const BELIEF_SYSTEM_IDS = Object.freeze({
  ALWAYS_FUNCTIONING: literal('always-functioning'),
  NO_MISTAKES: literal('no-mistakes'),
  RESPONSIBLE_FOR_EVERYTHING: literal('responsible-for-everything'),
  DO_EVERYTHING_ALONE: literal('do-everything-alone'),
  PERFECT_EVERYTHING: literal('perfect-everything'),
  THERE_FOR_OTHERS: literal('there-for-others'),
  PERFECT_EXPECT_OTHERS: literal('perfect-expect-others'),
  LOVE_REQUIRES_CONFORMITY: literal('love-requires-conformity'),
  ALWAYS_CONSIDERATE: literal('always-considerate'),
  MUST_ADAPT: literal('must-adapt'),
  LOVED_BY_EVERYONE: literal('loved-by-everyone'),
  CANNOT_BURDEN_OTHERS: literal('cannot-burden-others'),
  INFERIOR_TO_OTHERS: literal('inferior-to-others'),
  OTHERS_ARE_BETTER: literal('others-are-better'),
  MUST_NOT_BE_ANGRY: literal('must-not-be-angry'),
  MUST_STAY_IN_CONTROL: literal('must-stay-in-control'),
  MUST_NOT_BE_CENTER: literal('must-not-be-center'),
  MUST_NOT_SAY_NO: literal('must-not-say-no'),
  LOVE_REQUIRES_SUCCESS: literal('love-requires-success'),
  LOVE_MAKES_VULNERABLE: literal('love-makes-vulnerable'),
  LOVE_REQUIRES_HELPING: literal('love-requires-helping'),
  ANGER_LOOKS_STUPID: literal('anger-looks-stupid'),
});

export const CHECK_IN_EVENTS = Object.freeze({
  EMOTION_HELP_TOGGLED: literal('emotion.helpToggled'),
  TOUCH_STARTED: literal('touch.started'),
  SELECTION_CHANGED: literal('selection.changed'),
  SELECTION_CANCELLED: literal('selection.cancelled'),
  SELECTION_RELEASED: literal('selection.released'),
  NOTE_CHANGED: literal('note.changed'),
  BELIEF_SYSTEM_CHANGED: literal('beliefSystem.changed'),
  BELIEF_SYSTEM_BACK_REQUESTED: literal('beliefSystem.backRequested'),
  BELIEF_SYSTEM_CATALOG_REQUESTED: literal('beliefSystem.catalogRequested'),
  BELIEF_SYSTEM_CATALOG_CLOSED: literal('beliefSystem.catalogClosed'),
  CUSTOM_BELIEF_SYSTEM_REQUESTED: literal('beliefSystem.customRequested'),
  BELIEF_SYSTEM_EDITOR_CANCELLED: literal('beliefSystem.editorCancelled'),
  BELIEF_SYSTEM_DRAFT_CHANGED: literal('beliefSystem.draftChanged'),
  GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED: literal('beliefSystem.guidingDraftChanged'),
  GUIDING_BELIEF_HELP_TOGGLED: literal('beliefSystem.guidingHelpToggled'),
  BELIEF_SYSTEM_EDITOR_CONFIRMED: literal('beliefSystem.editorConfirmed'),
  GUIDING_BELIEF_BACK_REQUESTED: literal('beliefSystem.guidingBackRequested'),
  GUIDING_BELIEF_SKIPPED: literal('beliefSystem.guidingSkipped'),
  GUIDING_BELIEF_CONFIRMED: literal('beliefSystem.guidingConfirmed'),
  BELIEF_STATEMENTS_HYDRATED: literal('beliefSystem.statementsHydrated'),
  BELIEF_STATEMENTS_HYDRATION_FAILED: literal('beliefSystem.statementsHydrationFailed'),
  BELIEF_STATEMENT_PERSISTED: literal('beliefSystem.statementPersisted'),
  BELIEF_STATEMENT_REMOVED: literal('beliefSystem.statementRemoved'),
  BELIEF_STATEMENT_PERSISTENCE_FAILED: literal('beliefSystem.statementPersistenceFailed'),
  CONFIRMED: literal('checkIn.confirmed'),
  PERSISTED: literal('checkIn.persisted'),
  FAILED: literal('checkIn.failed'),
  HISTORY_HYDRATED: literal('checkIn.historyHydrated'),
  HISTORY_HYDRATION_FAILED: literal('checkIn.historyHydrationFailed'),
  EDIT_REQUESTED: literal('checkIn.editRequested'),
  EDIT_SELECTION_REQUESTED: literal('checkIn.editSelectionRequested'),
  DELETE_REQUESTED: literal('checkIn.deleteRequested'),
  DELETED: literal('checkIn.deleted'),
  DELETE_FAILED: literal('checkIn.deleteFailed'),
  RETRIED: literal('checkIn.retried'),
  RESTARTED: literal('checkIn.restarted'),
  REFLECTION_CANCELLED: literal('reflection.cancelled'),
});

export const CHECK_IN_STATES = Object.freeze({
  IDLE: literal('idle'),
  EXPLORING: literal('exploring'),
  REFLECTING: literal('reflecting'),
  SAVING: literal('saving'),
  BELIEF_SYSTEM: literal('beliefSystem'),
  BELIEF_SYSTEM_CATALOG: literal('beliefSystemCatalog'),
  BELIEF_SYSTEM_EDITOR: literal('beliefSystemEditor'),
  PERSISTING_BELIEF_STATEMENT: literal('persistingBeliefStatement'),
  BELIEF_STATEMENT_FAILURE: literal('beliefStatementFailure'),
  ATTACHING_BELIEF_SYSTEM: literal('attachingBeliefSystem'),
  BELIEF_SYSTEM_FAILURE: literal('beliefSystemFailure'),
  GUIDING_BELIEF: literal('guidingBelief'),
  PERSISTING_GUIDING_BELIEF: literal('persistingGuidingBelief'),
  GUIDING_BELIEF_FAILURE: literal('guidingBeliefFailure'),
  SUCCESS: literal('success'),
  FAILURE: literal('failure'),
});

export const NAVIGATION_EVENTS = Object.freeze({
  BACK_REQUESTED: literal('navigation.backRequested'),
  TODAY_OPENED: literal('navigation.todayOpened'),
  HISTORY_OPENED: literal('navigation.historyOpened'),
  ANALYTICS_OPENED: literal('navigation.analyticsOpened'),
  SETTINGS_OPENED: literal('navigation.settingsOpened'),
});

export const ANALYTICS_EVENTS = Object.freeze({
  PREVIOUS_MONTH_REQUESTED: literal('analytics.previousMonthRequested'),
  NEXT_MONTH_REQUESTED: literal('analytics.nextMonthRequested'),
  CURRENT_MONTH_REQUESTED: literal('analytics.currentMonthRequested'),
  TIMEFRAME_SELECTED: literal('analytics.timeframeSelected'),
});

export const ANALYTICS_TIMEFRAMES = Object.freeze({
  LAST_WEEK: literal('lastWeek'),
  LAST_FOUR_WEEKS: literal('lastFourWeeks'),
  ALL_TIME: literal('allTime'),
});

export const HISTORY_EVENTS = Object.freeze({
  TIMEFRAME_SELECTED: literal('history.timeframeSelected'),
});

export const ONBOARDING_EVENTS = Object.freeze({
  OPENED: literal('onboarding.opened'),
  NEXT_REQUESTED: literal('onboarding.nextRequested'),
  BACK_REQUESTED: literal('onboarding.backRequested'),
  SKIPPED: literal('onboarding.skipped'),
  FINISHED: literal('onboarding.finished'),
  TOUCH_STARTED: literal('onboarding.touchStarted'),
  SELECTION_CHANGED: literal('onboarding.selectionChanged'),
  SELECTION_CANCELLED: literal('onboarding.selectionCancelled'),
  SELECTION_RELEASED: literal('onboarding.selectionReleased'),
  EXAMPLE_REQUESTED: literal('onboarding.exampleRequested'),
});

export const ONBOARDING_STATES = Object.freeze({
  WELCOME: literal('welcome'),
  PULSE: literal('pulse'),
  EXAMPLE: literal('example'),
});

export const ONBOARDING_ENTRY_POINTS = Object.freeze({
  FIRST_LAUNCH: literal('firstLaunch'),
  SETTINGS: literal('settings'),
});

export const SETTINGS_EVENTS = Object.freeze({
  LANGUAGE_CHANGED: literal('settings.languageChanged'),
  EMOTION_LABEL_MODE_CHANGED: literal('settings.emotionLabelModeChanged'),
  APP_SETTINGS_HYDRATED: literal('settings.appSettingsHydrated'),
  APP_SETTINGS_HYDRATION_FAILED: literal('settings.appSettingsHydrationFailed'),
  APP_SETTINGS_PERSISTENCE_FAILED: literal('settings.appSettingsPersistenceFailed'),
});

export const BELIEF_LIBRARY_EVENTS = Object.freeze({
  OPENED: literal('beliefLibrary.opened'),
  CLOSED: literal('beliefLibrary.closed'),
  CREATE_REQUESTED: literal('beliefLibrary.createRequested'),
  EDIT_REQUESTED: literal('beliefLibrary.editRequested'),
  EDIT_CANCELLED: literal('beliefLibrary.editCancelled'),
  HARMFUL_DRAFT_CHANGED: literal('beliefLibrary.harmfulDraftChanged'),
  GUIDING_DRAFT_CHANGED: literal('beliefLibrary.guidingDraftChanged'),
  GUIDING_HELP_TOGGLED: literal('beliefLibrary.guidingHelpToggled'),
  SAVE_REQUESTED: literal('beliefLibrary.saveRequested'),
  REMOVE_REQUESTED: literal('beliefLibrary.removeRequested'),
  STATEMENT_SAVED: literal('beliefLibrary.statementSaved'),
  STATEMENT_RETIRED: literal('beliefLibrary.statementRetired'),
  OPERATION_FAILED: literal('beliefLibrary.operationFailed'),
});

export const BELIEF_LIBRARY_STATES = Object.freeze({
  LIBRARY: literal('beliefLibrary'),
  EDITOR: literal('beliefLibraryEditor'),
  SAVING: literal('savingBeliefLibraryStatement'),
  RETIRING: literal('retiringBeliefLibraryStatement'),
});

export const EMOTION_LABEL_MODES = Object.freeze({
  EMOJI: literal('emoji'),
  TEXT: literal('text'),
  BOTH: literal('both'),
});

export const NAVIGATION_STATES = Object.freeze({
  STARTING: literal('starting'),
  ONBOARDING: literal('onboarding'),
  TABS: literal('tabs'),
  TODAY: literal('today'),
  HISTORY: literal('history'),
  ANALYTICS: literal('analytics'),
  SETTINGS: literal('settings'),
  REFLECTION: literal('reflection'),
});

export const SPLASH_EVENTS = Object.freeze({
  LAYOUT_READY: literal('splash.layoutReady'),
  LOGO_READY: literal('splash.logoReady'),
  REDUCED_MOTION_LAYOUT_READY: literal('splash.reducedMotionLayoutReady'),
});

export const SPLASH_STATES = Object.freeze({
  WAITING_FOR_LAYOUT: literal('waitingForLayout'),
  WAITING_FOR_LOGO: literal('waitingForLogo'),
  WAITING_FOR_REDUCED_MOTION_LOGO: literal('waitingForReducedMotionLogo'),
  WAITING_FOR_LAYOUT_AFTER_LOGO: literal('waitingForLayoutAfterLogo'),
  REVEALING: literal('revealing'),
  FADING: literal('fading'),
  COMPLETE: literal('complete'),
});

export const APP_ROUTES = Object.freeze({
  ONBOARDING: literal('/onboarding'),
  ONBOARDING_PULSE: literal('/onboarding-pulse'),
  ONBOARDING_EXAMPLE: literal('/onboarding-example'),
  TODAY: literal('/today'),
  HISTORY: literal('/history'),
  ANALYTICS: literal('/analytics'),
  SETTINGS: literal('/settings'),
  BELIEF_LIBRARY: literal('/belief-library'),
  BELIEF_LIBRARY_EDITOR: literal('/belief-library-editor'),
  REFLECTION: literal('/reflection'),
  BELIEF_SYSTEM: literal('/belief-system'),
  BELIEF_SYSTEM_CATALOG: literal('/belief-system-catalog'),
  BELIEF_SYSTEM_EDITOR: literal('/belief-system-editor'),
  GUIDING_BELIEF: literal('/guiding-belief'),
  SUCCESS: literal('/success'),
});

export const APP_LOCALES = Object.freeze({
  ENGLISH: literal('en-US'),
  GERMAN: literal('de-DE'),
});

export const APP_TYPE = Object.freeze({
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
});

export const CHECK_IN_STORAGE_KEY = 'youmotion.check-ins.v1';
export const SURREAL_DATABASE_DIRECTORY = 'youmotion-surrealdb';
export const SURREAL_DATABASE_NAMESPACE = 'youmotion';
export const SURREAL_DATABASE_NAME = 'local';
export const SURREAL_DATABASE_ENDPOINT_PREFIX = 'surrealkv://';
export const FILE_URI_PREFIX = 'file://';
export const CHECK_IN_TABLE = 'check_in';
export const BELIEF_STATEMENT_TABLE = 'belief_statement';
export const APP_SETTINGS_TABLE = 'app_settings';
export const APP_SETTINGS_RECORD_ID = 'current';
export const MAX_NOTE_LENGTH = 240;
export const MAX_BELIEF_STATEMENT_LENGTH = 240;
export const CUSTOM_BELIEF_SYSTEM_ID_PREFIX = 'custom-';
export const CHECK_IN_FAILURE_MESSAGE = 'Your check-in could not be saved.';
export const BELIEF_SYSTEM_FAILURE_MESSAGE = 'Your core belief could not be attached.';
export const BELIEF_STATEMENT_FAILURE_MESSAGE = 'Your belief could not be saved.';
export const CHECK_IN_DELETE_FAILURE_MESSAGE = 'Your check-in could not be deleted.';
export const SETTINGS_FAILURE_MESSAGE = 'Your preference could not be saved.';
export const EMOTION_AXIS_START_ANGLE = -Math.PI / 4;
export const EMOTION_AXIS_STEP = Math.PI / 4;
export const BASE_RIPPLE_DURATION = 2800;
export const BASE_RIPPLE_PHASES = Object.freeze([0, 0.25, 0.5, 0.75]);
export const MOTION_DURATION = Object.freeze({
  MICRO: 140,
  STATE: 180,
  ENTER: 240,
});
export const MOTION_OFFSET = Object.freeze({
  STATE: 4,
  ENTER: 8,
});
export const REFLECTION_KEYBOARD_BOTTOM_OFFSET = 82;
export const SPLASH_BACKGROUND_COLOR = '#F4F0E8';
export const SPLASH_LOGO_SIZE = 156;
export const SPLASH_LOGO_REVEAL_DURATION = 680;
export const SPLASH_OVERLAY_VISIBLE_DURATION = 700;
export const SPLASH_OVERLAY_FADE_DURATION = 180;
export const ONBOARDING_STEP_COUNT = 3;
