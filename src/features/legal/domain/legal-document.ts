import * as Schema from 'effect/Schema';

import { LEGAL_DOCUMENT_KINDS } from '@/constants';

export const LegalDocumentKindSchema = Schema.Literal(
  LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY,
  LEGAL_DOCUMENT_KINDS.TERMS_OF_USE,
);

export type LegalDocumentKind = typeof LegalDocumentKindSchema.Type;
