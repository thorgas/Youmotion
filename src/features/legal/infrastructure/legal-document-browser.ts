import * as WebBrowser from 'expo-web-browser';
import * as Schema from 'effect/Schema';

import { LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_URLS } from '@/constants';
import type { LegalDocumentKind } from '../domain/legal-document';

export class LegalDocumentBrowserError extends Schema.TaggedError<LegalDocumentBrowserError>()(
  'LegalDocumentBrowserError',
  { cause: Schema.Unknown },
) {}

function documentUrl(kind: LegalDocumentKind) {
  return kind === LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY
    ? LEGAL_DOCUMENT_URLS.PRIVACY_POLICY
    : LEGAL_DOCUMENT_URLS.TERMS_OF_USE;
}

export async function openLegalDocument(kind: LegalDocumentKind) {
  try {
    await WebBrowser.openBrowserAsync(documentUrl(kind), {
      dismissButtonStyle: 'close',
      enableBarCollapsing: true,
      showTitle: true,
    });
  } catch (cause) {
    throw LegalDocumentBrowserError.make({ cause });
  }
}
