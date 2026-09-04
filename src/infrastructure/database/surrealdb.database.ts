import { Directory, Paths } from 'expo-file-system';
import * as Effect from 'effect/Effect';
import { connect, type SurrealClient } from 'react-native-surrealdb';
import assert from '@/assert';

import {
  FILE_URI_PREFIX,
  SURREAL_DATABASE_DIRECTORY,
  SURREAL_DATABASE_ENDPOINT_PREFIX,
  SURREAL_DATABASE_NAME,
  SURREAL_DATABASE_NAMESPACE,
} from '@/constants';
import { runDatabaseMigrations } from './migrations/database-migration.runner';

let databasePromise: Promise<SurrealClient> | undefined;
const databaseAccess = Effect.unsafeMakeSemaphore(1);

function databaseEndpoint(directory: Directory) {
  assert(FILE_URI_PREFIX.length > 0, 'File URI prefix must be configured.');
  assert(SURREAL_DATABASE_ENDPOINT_PREFIX.length > 0, 'Database endpoint prefix must be configured.');
  if (!directory.uri.startsWith(FILE_URI_PREFIX)) {
    throw new Error('SurrealDB requires a local file URI.');
  }
  return `${SURREAL_DATABASE_ENDPOINT_PREFIX}${directory.uri.slice(FILE_URI_PREFIX.length)}`;
}

async function connectDatabase() {
  assert(SURREAL_DATABASE_NAMESPACE.length > 0, 'Database namespace must be configured.');
  assert(SURREAL_DATABASE_NAME.length > 0, 'Database name must be configured.');
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
  assert(databasePromise !== undefined, 'A failed connection must have been in flight.');
  assert(cause !== undefined, 'A failed connection must provide a cause.');
  databasePromise = undefined;
  throw cause;
}

export function getDatabase() {
  assert(SURREAL_DATABASE_NAMESPACE.length > 0, 'Database access requires a namespace.');
  assert(SURREAL_DATABASE_NAME.length > 0, 'Database access requires a database name.');
  if (databasePromise) return databasePromise;
  databasePromise = connectDatabase().catch(resetFailedConnection);
  return databasePromise;
}

export async function queryDatabase<T = unknown>({
  surql,
  variables,
}: {
  surql: string;
  variables?: Parameters<SurrealClient['query']>[1];
}) {
  assert(surql.trim().length > 0, 'Database query must not be empty.');
  assert(!surql.includes('\0'), 'Database query must not contain null bytes.');
  await Effect.runPromise(databaseAccess.take(1));
  try {
    const database = await getDatabase();
    return variables === undefined
      ? await database.query<T>(surql)
      : await database.query<T>(surql, variables);
  } finally {
    await Effect.runPromise(databaseAccess.release(1));
  }
}
