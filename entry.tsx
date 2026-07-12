import * as Inspector from '@callstack/inspector';
import * as ExpoRouterEntry from 'expo-router/entry';

import { installDevelopmentTracing } from './src/development/install-tracing';

void Inspector;
installDevelopmentTracing();
void ExpoRouterEntry;
