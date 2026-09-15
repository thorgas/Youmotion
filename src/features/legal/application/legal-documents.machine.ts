import * as Schema from 'effect/Schema';
import { setup } from 'xstate';

import {
  LEGAL_DOCUMENT_EVENTS,
  LEGAL_DOCUMENT_STATES,
} from '@/constants';
import { AppLocaleSchema } from '@/localization/app-locale';
import { LegalDocumentKindSchema } from '../domain/legal-document';
import { openLegalDocument } from '../infrastructure/legal-document-browser';

const EmptyEventSchema = Schema.standardSchemaV1(Schema.Struct({}));

export const legalDocumentsMachine = setup({
  states: {
    [LEGAL_DOCUMENT_STATES.IDLE]: {},
    [LEGAL_DOCUMENT_STATES.OPENING]: {},
    [LEGAL_DOCUMENT_STATES.FAILURE]: {},
  },
  schemas: {
    context: Schema.standardSchemaV1(Schema.Struct({
      document: Schema.NullOr(LegalDocumentKindSchema),
      locale: Schema.NullOr(AppLocaleSchema),
    })),
    events: {
      [LEGAL_DOCUMENT_EVENTS.OPEN_REQUESTED]: Schema.standardSchemaV1(Schema.Struct({
        document: LegalDocumentKindSchema,
        locale: AppLocaleSchema,
      })),
      [LEGAL_DOCUMENT_EVENTS.OPENED]: EmptyEventSchema,
      [LEGAL_DOCUMENT_EVENTS.OPEN_FAILED]: EmptyEventSchema,
      [LEGAL_DOCUMENT_EVENTS.DISMISSED]: EmptyEventSchema,
    },
  },
}).createMachine({
  id: 'legalDocuments',
  initial: LEGAL_DOCUMENT_STATES.IDLE,
  context: { document: null, locale: null },
  states: {
    [LEGAL_DOCUMENT_STATES.IDLE]: {
      on: {
        [LEGAL_DOCUMENT_EVENTS.OPEN_REQUESTED]: {
          target: LEGAL_DOCUMENT_STATES.OPENING,
          context: ({ event }) => ({ document: event.document, locale: event.locale }),
        },
      },
    },
    [LEGAL_DOCUMENT_STATES.OPENING]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          if (context.document === null || context.locale === null) {
            self.send({ type: LEGAL_DOCUMENT_EVENTS.OPEN_FAILED });
            return;
          }
          void openLegalDocument({ kind: context.document, locale: context.locale }).then(
            () => self.send({ type: LEGAL_DOCUMENT_EVENTS.OPENED }),
            () => self.send({ type: LEGAL_DOCUMENT_EVENTS.OPEN_FAILED }),
          );
        });
      },
      on: {
        [LEGAL_DOCUMENT_EVENTS.OPENED]: {
          target: LEGAL_DOCUMENT_STATES.IDLE,
          context: { document: null, locale: null },
        },
        [LEGAL_DOCUMENT_EVENTS.OPEN_FAILED]: {
          target: LEGAL_DOCUMENT_STATES.FAILURE,
        },
      },
    },
    [LEGAL_DOCUMENT_STATES.FAILURE]: {
      on: {
        [LEGAL_DOCUMENT_EVENTS.DISMISSED]: {
          target: LEGAL_DOCUMENT_STATES.IDLE,
          context: { document: null, locale: null },
        },
      },
    },
  },
});
