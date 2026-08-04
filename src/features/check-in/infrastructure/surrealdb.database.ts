import { Directory, Paths } from 'expo-file-system';
import * as Effect from 'effect/Effect';
import { connect, type SurrealClient } from 'react-native-surrealdb';

import {
  FILE_URI_PREFIX,
  SURREAL_DATABASE_DIRECTORY,
  SURREAL_DATABASE_ENDPOINT_PREFIX,
  SURREAL_DATABASE_NAME,
  SURREAL_DATABASE_NAMESPACE,
} from '@/constants';
import { runDatabaseMigrations } from './migrations/database-migration.runner';

let databasePromise: Promise<SurrealClient> | undefined;

function databaseEndpoint(directory: Directory) {
  if (!directory.uri.startsWith(FILE_URI_PREFIX)) {
    throw new Error('SurrealDB requires a local file URI.');
  }
  return `${SURREAL_DATABASE_ENDPOINT_PREFIX}${directory.uri.slice(FILE_URI_PREFIX.length)}`;
}

async function connectDatabase() {
  const directory = new Directory(Paths.document, SURREAL_DATABASE_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });
  const database = await connect({
    endpoint: databaseEndpoint(directory),
    namespace: SURREAL_DATABASE_NAMESPACE,
    database: SURREAL_DATABASE_NAME,
  });
  await Effect.runPromise(runDatabaseMigrations(database));
  return database;
}

function resetFailedConnection(cause: unknown): never {
  databasePromise = undefined;
  throw cause;
}

export function getDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = connectDatabase().catch(resetFailedConnection);
  return databasePromise;
}
