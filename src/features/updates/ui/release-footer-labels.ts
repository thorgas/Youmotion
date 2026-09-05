import { fbs } from 'fbtee';
import assert from '@/assert';
import type { QaUpdateMode, QaUpdateOutcome, UpdateKitActionId } from 'expo-update-kit';
import type { UpdateMenuLabels } from 'expo-update-kit/ui';

const UPDATE_ID_PREVIEW_LENGTH = 8;

const qaTitle = () => String(fbs('Updates · QA', 'Title of the release menu while on the QA update channel'));
const productionTitle = () => String(fbs('Updates · Production', 'Title of the release menu while on the production update channel'));
const checkAction = () => String(fbs('Check for update now', 'Release menu action fetching an over-the-air update'));
const switchToQaAction = () => String(fbs('Switch to QA', 'Release menu action moving the app to the QA update channel'));
const switchToProductionAction = () => String(fbs('Switch to production', 'Release menu action moving the app back to the production update channel'));
const cancelAction = () => String(fbs('Cancel', 'Release menu action dismissing the update menu'));
const disabledTitle = () => String(fbs('Updates are disabled in this build', 'Alert title shown when the running build never checks for updates'));
const disabledMessage = () => String(fbs('This is a development or dev-client build; expo-updates never checks here.', 'Alert explaining why a development build cannot check for updates'));
const errorTitle = () => String(fbs('Update check failed', 'Alert title shown when an over-the-air update check failed'));
const upToDateTitle = (updateId: string) => String(fbs(
  'You’re up to date · ' + fbs.param('updateId', updateId),
  'Alert title confirming the running build already carries the newest update',
));

const actionLabel = (id: UpdateKitActionId) => {
  assert(id.length > 0, 'Update action id must not be empty.');
  if (id === 'check') return checkAction();
  if (id === 'switch-to-qa') return switchToQaAction();

  assert(id === 'switch-to-production', 'Unknown update action id: ' + id);

  return switchToProductionAction();
};

const outcomeAlert = (outcome: QaUpdateOutcome) => {
  assert(outcome.kind.length > 0, 'Update outcome kind must not be empty.');
  if (outcome.kind === 'reloading') return null;
  if (outcome.kind === 'disabled') {
    return { message: disabledMessage(), title: disabledTitle() };
  }
  if (outcome.kind === 'error') {
    return { message: outcome.message, title: errorTitle() };
  }

  assert(outcome.kind === 'up-to-date', 'Unknown update outcome kind: ' + outcome.kind);

  return {
    title: upToDateTitle(
      outcome.updateId === null
        ? String(fbs('none', 'Placeholder shown when the running build has no update identifier'))
        : outcome.updateId.slice(0, UPDATE_ID_PREVIEW_LENGTH),
    ),
  };
};

export function releaseFooterLabels(): UpdateMenuLabels {
  return {
    action: actionLabel,
    cancel: cancelAction(),
    outcome: outcomeAlert,
    title: (mode: QaUpdateMode) => (mode === 'qa' ? qaTitle() : productionTitle()),
  };
}
