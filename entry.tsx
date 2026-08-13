import * as Inspector from '@callstack/inspector';
import * as ExpoRouterEntry from 'expo-router/entry';

import { installDevelopmentTracing } from './src/development/install-tracing';
import { installReminderNotificationBridge } from './src/features/reminders/infrastructure/reminder-notification.bridge';

void Inspector;
installDevelopmentTracing();
installReminderNotificationBridge();
void ExpoRouterEntry;
