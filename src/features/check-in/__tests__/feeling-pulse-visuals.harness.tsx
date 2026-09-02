import {
  describe,
  render,
  test,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import { View } from 'react-native';

import { CenteredBaseStateRipples } from '../ui/base-state-ripples';
import { FeelingPulseGuides } from '../ui/feeling-pulse-guides';

describe('Feeling Pulse visual surface on the device runtime', () => {
  test('renders the circular guides and raised peak without native errors', async () => {
    await render(
      <View>
        <FeelingPulseGuides
          active={false}
          center={160}
          radius={144}
          size={320}
        />
        <CenteredBaseStateRipples />
      </View>,
    );

    const screenshot = await screen.screenshot();
    if (!screenshot) throw new Error('The native Feeling Pulse screenshot is required.');
  });
});
