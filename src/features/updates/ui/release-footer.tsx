import { fbs } from 'fbtee';
import { ReleaseFooter as UpdateKitReleaseFooter } from 'expo-update-kit/ui';
import { palette } from '@/theme';
import { releaseFooterLabels } from './release-footer-labels';

const channelLine = () => String(fbs('channel', 'Release footer prefix naming the EAS update channel'));
const appLine = () => String(fbs('app', 'Release footer prefix naming the app version'));
const runtimeLine = () => String(fbs('runtime', 'Release footer prefix naming the runtime version'));

export function ReleaseFooter({ testID }: { testID: string }) {
  return (
    <UpdateKitReleaseFooter
      color={palette.inkMuted}
      labels={releaseFooterLabels()}
      lines={{ app: appLine(), channel: channelLine(), runtime: runtimeLine() }}
      testID={testID}
    />
  );
}
