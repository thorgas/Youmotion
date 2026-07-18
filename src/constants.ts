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
});

export const CHECK_IN_EVENTS = Object.freeze({
  TOUCH_STARTED: literal('touch.started'),
  SELECTION_CHANGED: literal('selection.changed'),
  SELECTION_CANCELLED: literal('selection.cancelled'),
  SELECTION_RELEASED: literal('selection.released'),
  NOTE_CHANGED: literal('note.changed'),
  BELIEF_SYSTEM_CHANGED: literal('beliefSystem.changed'),
  BELIEF_SYSTEM_BACK_REQUESTED: literal('beliefSystem.backRequested'),
  BELIEF_SYSTEM_CATALOG_REQUESTED: literal('beliefSystem.catalogRequested'),
  BELIEF_SYSTEM_CATALOG_CLOSED: literal('beliefSystem.catalogClosed'),
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
  ATTACHING_BELIEF_SYSTEM: literal('attachingBeliefSystem'),
  BELIEF_SYSTEM_FAILURE: literal('beliefSystemFailure'),
  SUCCESS: literal('success'),
  FAILURE: literal('failure'),
});

export const NAVIGATION_EVENTS = Object.freeze({
  TODAY_OPENED: literal('navigation.todayOpened'),
  HISTORY_OPENED: literal('navigation.historyOpened'),
  SETTINGS_OPENED: literal('navigation.settingsOpened'),
});

export const SETTINGS_EVENTS = Object.freeze({
  EMOTION_LABEL_MODE_CHANGED: literal('settings.emotionLabelModeChanged'),
  EMOTION_LABEL_MODE_HYDRATED: literal('settings.emotionLabelModeHydrated'),
  EMOTION_LABEL_MODE_HYDRATION_FAILED: literal('settings.emotionLabelModeHydrationFailed'),
  EMOTION_LABEL_MODE_PERSISTENCE_FAILED: literal('settings.emotionLabelModePersistenceFailed'),
});

export const EMOTION_LABEL_MODES = Object.freeze({
  EMOJI: literal('emoji'),
  TEXT: literal('text'),
  BOTH: literal('both'),
});

export const NAVIGATION_STATES = Object.freeze({
  TABS: literal('tabs'),
  TODAY: literal('today'),
  HISTORY: literal('history'),
  SETTINGS: literal('settings'),
  REFLECTION: literal('reflection'),
});

export const APP_ROUTES = Object.freeze({
  TODAY: literal('/today'),
  HISTORY: literal('/history'),
  SETTINGS: literal('/settings'),
  REFLECTION: literal('/reflection'),
  SUCCESS: literal('/success'),
});

export const APP_LOCALES = Object.freeze({
  ENGLISH: literal('en-US'),
  GERMAN: literal('de-DE'),
});

export const APP_TYPE = Object.freeze({
  regular: 'Fraunces_400Regular',
  medium: 'Fraunces_500Medium',
  semibold: 'Fraunces_600SemiBold',
});

export const CHECK_IN_STORAGE_KEY = 'youmotion.check-ins.v1';
export const EMOTION_LABEL_MODE_STORAGE_KEY = 'youmotion.emotion-label-mode.v1';
export const SURREAL_DATABASE_DIRECTORY = 'youmotion-surrealdb';
export const SURREAL_DATABASE_NAMESPACE = 'youmotion';
export const SURREAL_DATABASE_NAME = 'local';
export const SURREAL_DATABASE_ENDPOINT_PREFIX = 'surrealkv://';
export const FILE_URI_PREFIX = 'file://';
export const CHECK_IN_TABLE = 'check_in';
export const MAX_CHECK_IN_HISTORY = 30;
export const MAX_NOTE_LENGTH = 240;
export const CHECK_IN_FAILURE_MESSAGE = 'Your check-in could not be saved.';
export const BELIEF_SYSTEM_FAILURE_MESSAGE = 'Your core belief could not be attached.';
export const CHECK_IN_DELETE_FAILURE_MESSAGE = 'Your check-in could not be deleted.';
export const SETTINGS_FAILURE_MESSAGE = 'Your preference could not be saved.';
export const EMOTION_AXIS_START_ANGLE = -Math.PI / 4;
export const EMOTION_AXIS_STEP = Math.PI / 4;
export const BASE_RIPPLE_DURATION = 2800;
export const BASE_RIPPLE_PHASES = Object.freeze([0, 0.25, 0.5, 0.75]);
export const REFLECTION_KEYBOARD_BOTTOM_OFFSET = 82;
export const EMOTION_TEXT_REVEAL_DURATION = 620;
export const EMOTION_TEXT_REVEAL_STAGGER = 150;
export const EMOTION_LABEL_TRANSITION_DURATION = 180;
