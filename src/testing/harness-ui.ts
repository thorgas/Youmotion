import {
  screen,
  type ElementReference,
  userEvent,
} from '@react-native-harness/ui';

export async function findLaidOutByTestId(testID: string): Promise<ElementReference> {
  const element = await screen.findByTestId(testID);
  const screenshot = await screen.screenshot(element);
  if (!screenshot) {
    throw new Error(`Harness could not capture the laid-out element: ${testID}.`);
  }
  return element;
}

export async function pressLaidOutUntil({
  isComplete,
  testID,
}: {
  isComplete: () => boolean;
  testID: string;
}) {
  await userEvent.press(await findLaidOutByTestId(testID));
  if (isComplete()) return;
  await userEvent.press(await findLaidOutByTestId(testID));
  if (!isComplete()) {
    throw new Error(`Harness press did not complete the expected transition: ${testID}.`);
  }
}
