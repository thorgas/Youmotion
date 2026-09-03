import {
  describe,
  render,
  test,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import { View } from 'react-native';

import { CenteredBaseStateRipples } from '../ui/base-state-ripples';

describe('Feeling Pulse visual surface on the device runtime', () => {
  test('renders the movable ripples and raised peak without native errors', async () => {
    await render(
      <View>
        <CenteredBaseStateRipples />
      </View>,
    );

    const screenshot = await screen.screenshot();
    if (!screenshot) throw new Error('The native Feeling Pulse screenshot is required.');
  });
});
