import * as WebBrowser from 'expo-web-browser';

import { LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_URLS } from '@/constants';
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
    [LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY, LEGAL_DOCUMENT_URLS.PRIVACY_POLICY],
    [LEGAL_DOCUMENT_KINDS.TERMS_OF_USE, LEGAL_DOCUMENT_URLS.TERMS_OF_USE],
  ])('opens %s at its public HTTPS URL', async (kind, expectedUrl) => {
    await openLegalDocument(kind);

    expect(mockOpenBrowser).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({
      dismissButtonStyle: 'close',
      showTitle: true,
    }));
  });

  it('models browser failures as an expected error', async () => {
    mockOpenBrowser.mockRejectedValue(new Error('offline'));

    await expect(openLegalDocument(LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY)).rejects.toMatchObject({
      _tag: 'LegalDocumentBrowserError',
    });
  });
});
