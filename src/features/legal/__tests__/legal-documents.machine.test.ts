import { createActor, waitFor } from 'xstate';

import {
  APP_LOCALES,
  LEGAL_DOCUMENT_EVENTS,
  LEGAL_DOCUMENT_KINDS,
  LEGAL_DOCUMENT_STATES,
} from '@/constants';
import { legalDocumentsMachine } from '../application/legal-documents.machine';
import { openLegalDocument } from '../infrastructure/legal-document-browser';

jest.mock('../infrastructure/legal-document-browser', () => ({ openLegalDocument: jest.fn() }));

const mockOpenLegalDocument = jest.mocked(openLegalDocument);

describe('legal documents machine', () => {
  beforeEach(() => mockOpenLegalDocument.mockReset().mockResolvedValue());

  it('opens the selected document and returns to idle', async () => {
    const actor = createActor(legalDocumentsMachine).start();

    actor.send({
      type: LEGAL_DOCUMENT_EVENTS.OPEN_REQUESTED,
      document: LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY,
      locale: APP_LOCALES.GERMAN,
    });
    await waitFor(actor, (snapshot) => snapshot.matches(LEGAL_DOCUMENT_STATES.IDLE));

    expect(mockOpenLegalDocument).toHaveBeenCalledWith({
      kind: LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY,
      locale: APP_LOCALES.GERMAN,
    });
    expect(actor.getSnapshot().context.document).toBeNull();
    expect(actor.getSnapshot().context.locale).toBeNull();
    actor.stop();
  });

  it('shows a dismissible failure when the browser cannot open', async () => {
    mockOpenLegalDocument.mockRejectedValue(new Error('offline'));
    const actor = createActor(legalDocumentsMachine).start();

    actor.send({
      type: LEGAL_DOCUMENT_EVENTS.OPEN_REQUESTED,
      document: LEGAL_DOCUMENT_KINDS.TERMS_OF_USE,
      locale: APP_LOCALES.ENGLISH,
    });
    await waitFor(actor, (snapshot) => snapshot.matches(LEGAL_DOCUMENT_STATES.FAILURE));
    actor.send({ type: LEGAL_DOCUMENT_EVENTS.DISMISSED });

    expect(actor.getSnapshot().matches(LEGAL_DOCUMENT_STATES.IDLE)).toBe(true);
    expect(actor.getSnapshot().context.document).toBeNull();
    expect(actor.getSnapshot().context.locale).toBeNull();
    actor.stop();
  });
});
