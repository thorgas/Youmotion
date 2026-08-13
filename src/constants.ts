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
  TOUCH_STARTED: literal('touch.started'),
  SELECTION_CHANGED: literal('selection.changed'),
  SELECTION_CANCELLED: literal('selection.cancelled'),
  SELECTION_RELEASED: literal('selection.released'),
  NOTE_CHANGED: literal('note.changed'),
  MOMENT_TIME_EDITOR_OPENED: literal('momentTime.editorOpened'),
  MOMENT_TIME_EDITOR_CLOSED: literal('momentTime.editorClosed'),
  MOMENT_TIME_EDITOR_CONFIRMED: literal('momentTime.editorConfirmed'),
  MOMENT_TIME_DATE_REQUESTED: literal('momentTime.dateRequested'),
  MOMENT_TIME_TIME_REQUESTED: literal('momentTime.timeRequested'),
  MOMENT_TIME_PICKER_DISMISSED: literal('momentTime.pickerDismissed'),
  MOMENT_TIME_CHANGED: literal('momentTime.changed'),
  MOMENT_TIME_RESET: literal('momentTime.reset'),
  SAVE_FOR_NOW_REQUESTED: literal('checkIn.saveForNowRequested'),
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

export const MOMENT_TIME_PICKER_MODES = Object.freeze({
  DATE: literal('date'),
  TIME: literal('time'),
});

export const CHECK_IN_SAVE_DESTINATIONS = Object.freeze({
  BELIEF_SYSTEM: literal('beliefSystem'),
  COMPLETE: literal('complete'),
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
  INSIGHT_TAB_SELECTED: literal('analytics.insightTabSelected'),
  NEXT_PATTERN_REQUESTED: literal('analytics.nextPatternRequested'),
});

export const ANALYTICS_INSIGHT_TABS = Object.freeze({
  GUIDING_BELIEF: literal('guidingBelief'),
  PATTERN: literal('pattern'),
});

export const ANALYTICS_TIMEFRAMES = Object.freeze({
  LAST_WEEK: literal('lastWeek'),
  LAST_FOUR_WEEKS: literal('lastFourWeeks'),
  ALL_TIME: literal('allTime'),
});

export const HISTORY_EVENTS = Object.freeze({
  TIMEFRAME_SELECTED: literal('history.timeframeSelected'),
  QUERY_CHANGED: literal('history.queryChanged'),
  FILTERS_TOGGLED: literal('history.filtersToggled'),
  EMOTION_FILTER_SELECTED: literal('history.emotionFilterSelected'),
  CONTENT_FILTER_SELECTED: literal('history.contentFilterSelected'),
  BELIEF_FILTER_SELECTED: literal('history.beliefFilterSelected'),
  FILTERS_CLEARED: literal('history.filtersCleared'),
});

export const HISTORY_CONTENT_FILTERS = Object.freeze({
  ALL: literal('all'),
  NOTES: literal('notes'),
  BELIEFS: literal('beliefs'),
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

export const DATA_SAFETY_EVENTS = Object.freeze({
  EXPORT_REQUESTED: literal('dataSafety.exportRequested'),
  EXPORT_SUCCEEDED: literal('dataSafety.exportSucceeded'),
  RESTORE_REQUESTED: literal('dataSafety.restoreRequested'),
  ARCHIVE_PICKED: literal('dataSafety.archivePicked'),
  PICK_CANCELLED: literal('dataSafety.pickCancelled'),
  RESTORE_CONFIRMED: literal('dataSafety.restoreConfirmed'),
  RESTORE_CANCELLED: literal('dataSafety.restoreCancelled'),
  RESTORE_SUCCEEDED: literal('dataSafety.restoreSucceeded'),
  DELETE_REQUESTED: literal('dataSafety.deleteRequested'),
  DELETE_CONFIRMED: literal('dataSafety.deleteConfirmed'),
  DELETE_CANCELLED: literal('dataSafety.deleteCancelled'),
  DELETE_SUCCEEDED: literal('dataSafety.deleteSucceeded'),
  OPERATION_FAILED: literal('dataSafety.operationFailed'),
  NOTICE_DISMISSED: literal('dataSafety.noticeDismissed'),
});

export const DATA_SAFETY_STATES = Object.freeze({
  IDLE: literal('dataSafetyIdle'),
  EXPORTING: literal('exportingData'),
  PICKING_ARCHIVE: literal('pickingDataArchive'),
  RESTORE_PREVIEW: literal('restorePreview'),
  RESTORING: literal('restoringData'),
  DELETE_CONFIRMATION: literal('deleteDataConfirmation'),
  DELETING: literal('deletingData'),
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

export const REMINDER_TARGET_KINDS = Object.freeze({
  PULSE: literal('pulse'),
  GUIDING_BELIEF: literal('guidingBelief'),
});

export const REMINDER_PERMISSION_STATES = Object.freeze({
  UNDETERMINED: literal('undetermined'),
  GRANTED: literal('granted'),
  DENIED: literal('denied'),
});

export const REMINDER_EVENTS = Object.freeze({
  OPENED: literal('reminder.opened'),
  HYDRATED: literal('reminder.hydrated'),
  HYDRATION_FAILED: literal('reminder.hydrationFailed'),
  OFFER_ACCEPTED: literal('reminder.offerAccepted'),
  OFFER_DECLINED: literal('reminder.offerDeclined'),
  PERMISSION_RESOLVED: literal('reminder.permissionResolved'),
  PERMISSION_FAILED: literal('reminder.permissionFailed'),
  SETTINGS_REQUESTED: literal('reminder.settingsRequested'),
  SETTINGS_RETURNED: literal('reminder.settingsReturned'),
  SCHEDULE_SELECTED: literal('reminder.scheduleSelected'),
  NEW_SCHEDULE_REQUESTED: literal('reminder.newScheduleRequested'),
  SCHEDULE_NAME_CHANGED: literal('reminder.scheduleNameChanged'),
  WEEKDAY_TOGGLED: literal('reminder.weekdayToggled'),
  TIME_SHIFTED: literal('reminder.timeShifted'),
  TIME_PICKER_REQUESTED: literal('reminder.timePickerRequested'),
  TIME_PICKER_DISMISSED: literal('reminder.timePickerDismissed'),
  TIME_CHANGED: literal('reminder.timeChanged'),
  TIME_ADDED: literal('reminder.timeAdded'),
  TIME_REMOVED: literal('reminder.timeRemoved'),
  SCHEDULE_SAVE_REQUESTED: literal('reminder.scheduleSaveRequested'),
  SCHEDULE_SAVED: literal('reminder.scheduleSaved'),
  ASSIGNMENT_TOGGLED: literal('reminder.assignmentToggled'),
  ASSIGNMENT_UPDATED: literal('reminder.assignmentUpdated'),
  RECONCILE_REQUESTED: literal('reminder.reconcileRequested'),
  OPERATION_FAILED: literal('reminder.operationFailed'),
  DONE: literal('reminder.done'),
  TEST_REQUESTED: literal('reminder.testRequested'),
  OPEN_PULSE_REQUESTED: literal('reminder.openPulseRequested'),
  EDIT_REQUESTED: literal('reminder.editRequested'),
  NOTIFICATION_OPENED: literal('reminder.notificationOpened'),
});

export const REMINDER_STATES = Object.freeze({
  SETTINGS: literal('reminderSettings'),
  OFFER: literal('leitsatzReminderOffer'),
  REQUESTING_PERMISSION: literal('requestingReminderPermission'),
  PERMISSION_DENIED: literal('reminderPermissionDenied'),
  SCHEDULE_PICKER: literal('reminderSchedulePicker'),
  SCHEDULE_EDITOR: literal('reminderScheduleEditor'),
  SAVING: literal('savingReminderSchedule'),
  ACTIVE: literal('leitsatzReminderActive'),
  GUIDING_BELIEF: literal('reminderGuidingBelief'),
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
  LEITSATZ_REMINDER: literal('/leitsatz-reminder'),
  REMINDERS: literal('/reminders'),
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
export const REMINDER_SCHEDULE_TABLE = 'reminder_schedule';
export const REMINDER_ASSIGNMENT_TABLE = 'reminder_assignment';
export const REMINDER_NOTIFICATION_CHANNEL_ID = 'gentle-reminders';
export const REMINDER_NOTIFICATION_OWNER = 'youmotion-reminder';
export const MAX_REMINDER_TIMES = 5;
export const DATABASE_MIGRATION_TABLE = 'database_migration';
export const APP_SETTINGS_RECORD_ID = 'current';
export const MAX_NOTE_LENGTH = 5_000;
export const MAX_BELIEF_STATEMENT_LENGTH = 240;
export const CUSTOM_BELIEF_SYSTEM_ID_PREFIX = 'custom-';
export const CHECK_IN_FAILURE_MESSAGE = 'Your check-in could not be saved.';
export const BELIEF_SYSTEM_FAILURE_MESSAGE = 'Your core belief could not be attached.';
export const BELIEF_STATEMENT_FAILURE_MESSAGE = 'Your belief could not be saved.';
export const CHECK_IN_DELETE_FAILURE_MESSAGE = 'Your check-in could not be deleted.';
export const SETTINGS_FAILURE_MESSAGE = 'Your preference could not be saved.';
export const DATA_EXPORT_FAILURE_MESSAGE = 'Your backup could not be created.';
export const DATA_ARCHIVE_FAILURE_MESSAGE = 'That backup could not be opened.';
export const DATA_RESTORE_FAILURE_MESSAGE = 'Your data was not changed because the backup could not be restored.';
export const DATA_DELETE_ALL_FAILURE_MESSAGE = 'Your moments could not be deleted.';
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
