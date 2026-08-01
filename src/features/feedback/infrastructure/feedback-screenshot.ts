import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { captureScreen } from 'react-native-view-shot';

import {
  parseFeedbackScreenshotUri,
  type FeedbackScreenshotUri,
} from '../domain/feedback-request';

export class FeedbackScreenshotError extends Schema.TaggedError<FeedbackScreenshotError>()(
  'FeedbackScreenshotError',
  { cause: Schema.Defect },
) {}

function waitForFeedbackUiToDisappear() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function captureFeedbackScreenshot(): Promise<FeedbackScreenshotUri> {
  try {
    await waitForFeedbackUiToDisappear();
    const uri = await captureScreen({ format: 'png', result: 'tmpfile' });
    return await Effect.runPromise(parseFeedbackScreenshotUri(uri));
  } catch (cause) {
    throw FeedbackScreenshotError.make({ cause });
  }
}
