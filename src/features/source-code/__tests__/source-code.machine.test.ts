import { createActor, waitFor } from 'xstate';
import { SOURCE_CODE_EVENTS, SOURCE_CODE_STATES } from '@/constants';
import { sourceCodeMachine } from '../application/source-code.machine';
import { openSourceCode } from '../infrastructure/source-code-browser';

jest.mock('../infrastructure/source-code-browser', () => ({ openSourceCode: jest.fn() }));
const mockOpen = jest.mocked(openSourceCode);

describe('source code machine', () => {
  beforeEach(() => mockOpen.mockReset().mockResolvedValue());
  it('ignores repeated opening requests until the browser closes', async () => {
    let close: (() => void) | undefined;
    mockOpen.mockImplementation(() => new Promise<void>((resolve) => { close = resolve; }));
    const actor = createActor(sourceCodeMachine).start();
    actor.send({ type: SOURCE_CODE_EVENTS.OPEN_REQUESTED });
    actor.send({ type: SOURCE_CODE_EVENTS.OPEN_REQUESTED });
    expect(actor.getSnapshot().matches(SOURCE_CODE_STATES.OPENING)).toBe(true);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    close?.();
    await waitFor(actor, (snapshot) => snapshot.matches(SOURCE_CODE_STATES.IDLE));
    actor.stop();
  });
  it('allows failure dismissal and another attempt', async () => {
    mockOpen.mockRejectedValueOnce(new Error('offline'));
    const actor = createActor(sourceCodeMachine).start();
    actor.send({ type: SOURCE_CODE_EVENTS.OPEN_REQUESTED });
    await waitFor(actor, (snapshot) => snapshot.matches(SOURCE_CODE_STATES.FAILURE));
    actor.send({ type: SOURCE_CODE_EVENTS.DISMISSED });
    expect(actor.getSnapshot().matches(SOURCE_CODE_STATES.IDLE)).toBe(true);
    actor.send({ type: SOURCE_CODE_EVENTS.OPEN_REQUESTED });
    await waitFor(actor, (snapshot) => snapshot.matches(SOURCE_CODE_STATES.IDLE));
    expect(mockOpen).toHaveBeenCalledTimes(2);
    actor.stop();
  });
  it('retries directly from failure', async () => {
    mockOpen.mockRejectedValueOnce(new Error('offline'));
    const actor = createActor(sourceCodeMachine).start();
    actor.send({ type: SOURCE_CODE_EVENTS.OPEN_REQUESTED });
    await waitFor(actor, (snapshot) => snapshot.matches(SOURCE_CODE_STATES.FAILURE));
    actor.send({ type: SOURCE_CODE_EVENTS.OPEN_REQUESTED });
    await waitFor(actor, (snapshot) => snapshot.matches(SOURCE_CODE_STATES.IDLE));
    expect(mockOpen).toHaveBeenCalledTimes(2);
    actor.stop();
  });
});
