import * as Schema from 'effect/Schema';

export const DatabaseMigrationId = Schema.String.pipe(
  Schema.brand('DatabaseMigrationId'),
);

export type DatabaseMigrationId = typeof DatabaseMigrationId.Type;

export type DatabaseMigration = {
  readonly id: DatabaseMigrationId;
  readonly description: string;
  readonly statement: string;
};
