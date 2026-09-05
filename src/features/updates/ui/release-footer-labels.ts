import { fbs } from 'fbtee';
import type { UpdateKitAction, UpdateOutcome } from 'expo-update-kit';
import type { UpdateMenuLabels } from 'expo-update-kit/ui';
import assert from '@/assert';

const UPDATE_ID_PREVIEW_LENGTH = 8;

const productionChannel = () => String(fbs('Production', 'Display name of the production update channel'));
const testingChannel = () => String(fbs('Testing', 'Display name of the testing update channel used by TestFlight and Play internal builds'));
const qaChannel = () => String(fbs('QA', 'Display name of the QA update channel'));
const checkAction = () => String(fbs('Check for update now', 'Release menu action fetching an over-the-air update'));
const cancelAction = () => String(fbs('Cancel', 'Release menu action dismissing the update menu'));
const moreAction = () => String(fbs('More channels…', 'Release menu row revealing further update channels on Android'));
const disabledTitle = () => String(fbs('Updates are disabled in this build', 'Alert title shown when the running build never checks for updates'));
const disabledMessage = () => String(fbs('This is a development or dev-client build; expo-updates never checks here.', 'Alert explaining why a development build cannot check for updates'));
const errorTitle = () => String(fbs('Update check failed', 'Alert title shown when an over-the-air update check failed'));
const switchedMessage = () => String(fbs('The next update check or app launch uses this channel.', 'Alert explaining that a channel switch applies on the next check or launch'));
const noUpdateId = () => String(fbs('none', 'Placeholder shown when the running build has no update identifier'));

const channelLabel = (channel: string) => {
  assert(channel.length > 0, 'Update channel name must not be empty.');
  assert(channel.trim() === channel, 'Update channel name must not carry whitespace.');
  if (channel === 'production') return productionChannel();
  if (channel === 'testing') return testingChannel();
  if (channel === 'qa') return qaChannel();

  return channel;
};

const menuTitle = (channel: string) => String(fbs(
  'Updates · ' + fbs.param('channel', channelLabel(channel)),
  'Title of the release menu naming the active update channel',
));
const switchAction = (channel: string) => String(fbs(
  'Switch to ' + fbs.param('channel', channelLabel(channel)),
  'Release menu action moving the app to another update channel',
));
const switchedTitle = (channel: string) => String(fbs(
  'Switched to ' + fbs.param('channel', channelLabel(channel)),
  'Alert title confirming the app now follows another update channel',
));
const upToDateTitle = (updateId: string) => String(fbs(
  'You’re up to date · ' + fbs.param('updateId', updateId),
  'Alert title confirming the running build already carries the newest update',
));

const actionLabel = (action: UpdateKitAction) => {
  assert(action.id.length > 0, 'Update action id must not be empty.');
  if (action.id === 'check') return checkAction();
  assert(action.id === 'switch', 'Unknown update action id: ' + action.id);

  return switchAction(action.channel);
};

const outcomeAlert = (outcome: UpdateOutcome) => {
  assert(outcome.kind.length > 0, 'Update outcome kind must not be empty.');
  if (outcome.kind === 'reloading') return null;
  if (outcome.kind === 'disabled') {
    return { message: disabledMessage(), title: disabledTitle() };
  }
  if (outcome.kind === 'error') {
    return { message: outcome.message, title: errorTitle() };
  }
  if (outcome.kind === 'switched') {
    return { message: switchedMessage(), title: switchedTitle(outcome.channel) };
  }
  assert(outcome.kind === 'up-to-date', 'Unknown update outcome kind: ' + outcome.kind);

  return {
    title: upToDateTitle(
      outcome.updateId === null ? noUpdateId() : outcome.updateId.slice(0, UPDATE_ID_PREVIEW_LENGTH),
    ),
  };
};

export function releaseFooterLabels(): UpdateMenuLabels {
  return {
    action: actionLabel,
    cancel: cancelAction(),
    more: moreAction(),
    outcome: outcomeAlert,
    title: menuTitle,
  };
}
