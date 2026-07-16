import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { CHECK_IN_STORAGE_KEY, MAX_CHECK_IN_HISTORY } from '@/constants';

import {
  CheckInId,
  CheckInListFromJson,
  CheckInTimestamp,
  type CheckIn,
  type EmotionSelection,
} from '../domain/check-in';

export class CheckInStorageError extends Schema.TaggedError<CheckInStorageError>()(
  'CheckInStorageError',
  {
    operation: Schema.Literal('read', 'write'),
    cause: Schema.Defect,
  },
) {}

export class CheckInDataError extends Schema.TaggedError<CheckInDataError>()(
  'CheckInDataError',
  {
    operation: Schema.Literal('decode', 'encode'),
    cause: Schema.Defect,
  },
) {}

const readRaw = Effect.tryPromise({
  try: () => AsyncStorage.getItem(CHECK_IN_STORAGE_KEY),
  catch: (cause) => CheckInStorageError.make({ operation: 'read', cause }),
});

export const loadCheckIns = readRaw.pipe(
  Effect.flatMap((raw) => {
    if (raw === null) return Effect.succeed<readonly CheckIn[]>([]);
    return Schema.decodeUnknown(CheckInListFromJson)(raw).pipe(
      Effect.mapError((cause) => CheckInDataError.make({ operation: 'decode', cause })),
    );
  }),
  Effect.withSpan('CheckInRepository.load'),
);

export const persistCheckIn = Effect.fn('CheckInRepository.persist')(({
  selection,
  note,
}: {
  selection: EmotionSelection;
  note: string;
}) => loadCheckIns.pipe(
  Effect.flatMap((existing) => {
    const checkIn: CheckIn = {
      id: CheckInId.make(`${Date.now()}-${Math.random().toString(16).slice(2)}`),
      createdAt: CheckInTimestamp.make(new Date().toISOString()),
      emotionId: selection.emotionId,
      intensity: selection.intensity,
      level: selection.level,
      note: note.trim(),
    };
    const next = [checkIn, ...existing].slice(0, MAX_CHECK_IN_HISTORY);
    return Schema.encode(CheckInListFromJson)(next).pipe(
      Effect.mapError((cause) => CheckInDataError.make({ operation: 'encode', cause })),
      Effect.flatMap((encoded) => Effect.tryPromise({
        try: () => AsyncStorage.setItem(CHECK_IN_STORAGE_KEY, encoded),
        catch: (cause) => CheckInStorageError.make({ operation: 'write', cause }),
      })),
      Effect.as(checkIn),
    );
  }),
));
