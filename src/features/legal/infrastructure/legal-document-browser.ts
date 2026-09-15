import * as WebBrowser from 'expo-web-browser';
import * as Schema from 'effect/Schema';

import { LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_URLS } from '@/constants';
import type { AppLocale } from '@/localization/app-locale';
import type { LegalDocumentKind } from '../domain/legal-document';

export class LegalDocumentBrowserError extends Schema.TaggedError<LegalDocumentBrowserError>()(
  'LegalDocumentBrowserError',
  { cause: Schema.Unknown },
) {}

function documentUrl({ kind, locale }: { kind: LegalDocumentKind; locale: AppLocale }) {
  const urls = LEGAL_DOCUMENT_URLS[locale];
  return kind === LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY
    ? urls.PRIVACY_POLICY
    : urls.TERMS_OF_USE;
}

export async function openLegalDocument({ kind, locale }: { kind: LegalDocumentKind; locale: AppLocale }) {
  try {
    await WebBrowser.openBrowserAsync(documentUrl({ kind, locale }), {
      dismissButtonStyle: 'close',
      enableBarCollapsing: true,
      showTitle: true,
    });
  } catch (cause) {
    throw LegalDocumentBrowserError.make({ cause });
  }
}
