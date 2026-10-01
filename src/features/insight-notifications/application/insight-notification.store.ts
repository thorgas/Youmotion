import { createStore } from '@xstate/store';
import * as Schema from 'effect/Schema';
import { REMINDER_PERMISSION_STATES } from '@/constants';
import { initialInsightNotificationState, InsightNotificationStateSchema } from '../domain/insight-notification';

const PermissionSchema = Schema.Literal(...Object.values(REMINDER_PERMISSION_STATES));
export function createInsightNotificationStore() {
  return createStore({
    schemas: {
      context: Schema.standardSchemaV1(Schema.Struct({
        settings: InsightNotificationStateSchema, hydrated: Schema.Boolean, busy: Schema.Boolean,
        pickerOpen: Schema.Boolean, permission: PermissionSchema, error: Schema.NullOr(Schema.String),
      })),
      events: {
        updated: Schema.standardSchemaV1(Schema.Struct({ settings: InsightNotificationStateSchema })),
        busyChanged: Schema.standardSchemaV1(Schema.Struct({ busy: Schema.Boolean })),
        permissionChanged: Schema.standardSchemaV1(Schema.Struct({ permission: PermissionSchema })),
        pickerChanged: Schema.standardSchemaV1(Schema.Struct({ open: Schema.Boolean })),
        failed: Schema.standardSchemaV1(Schema.Struct({ message: Schema.String })),
      },
    },
    context: { settings: initialInsightNotificationState(), hydrated: false, busy: false,
      pickerOpen: false, permission: REMINDER_PERMISSION_STATES.UNDETERMINED, error: null },
    on: {
      updated: (context, event) => ({ ...context, settings: event.settings, hydrated: true, error: null }),
      busyChanged: (context, event) => ({ ...context, busy: event.busy }),
      permissionChanged: (context, event) => ({ ...context, permission: event.permission }),
      pickerChanged: (context, event) => ({ ...context, pickerOpen: event.open }),
      failed: (context, event) => ({ ...context, error: event.message }),
    },
  });
}

