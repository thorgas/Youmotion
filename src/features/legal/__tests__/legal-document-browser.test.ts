import * as WebBrowser from 'expo-web-browser';

import { APP_LOCALES, LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_URLS } from '@/constants';
import { openLegalDocument } from '../infrastructure/legal-document-browser';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserResultType: { CANCEL: 'cancel' },
}));

const mockOpenBrowser = jest.mocked(WebBrowser.openBrowserAsync);

describe('legal document browser', () => {
  beforeEach(() => {
    mockOpenBrowser.mockReset().mockResolvedValue({ type: WebBrowser.WebBrowserResultType.CANCEL });
  });

  it.each([
    [APP_LOCALES.ENGLISH, LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY, LEGAL_DOCUMENT_URLS[APP_LOCALES.ENGLISH].PRIVACY_POLICY],
    [APP_LOCALES.ENGLISH, LEGAL_DOCUMENT_KINDS.TERMS_OF_USE, LEGAL_DOCUMENT_URLS[APP_LOCALES.ENGLISH].TERMS_OF_USE],
    [APP_LOCALES.GERMAN, LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY, LEGAL_DOCUMENT_URLS[APP_LOCALES.GERMAN].PRIVACY_POLICY],
    [APP_LOCALES.GERMAN, LEGAL_DOCUMENT_KINDS.TERMS_OF_USE, LEGAL_DOCUMENT_URLS[APP_LOCALES.GERMAN].TERMS_OF_USE],
  ])('opens %s %s at its public HTTPS URL', async (locale, kind, expectedUrl) => {
    await openLegalDocument({ kind, locale });

    expect(mockOpenBrowser).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({
      dismissButtonStyle: 'close',
      showTitle: true,
    }));
  });

  it('models browser failures as an expected error', async () => {
    mockOpenBrowser.mockRejectedValue(new Error('offline'));

    await expect(openLegalDocument({
      kind: LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY,
      locale: APP_LOCALES.ENGLISH,
    })).rejects.toMatchObject({
      _tag: 'LegalDocumentBrowserError',
    });
  });
});
