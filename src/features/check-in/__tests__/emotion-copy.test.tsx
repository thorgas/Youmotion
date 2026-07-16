import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { emotions } from '../domain/emotion';
import { emotionName, emotionNuance } from '../ui/emotion-copy';

function EmotionCatalog() {
  const labels: string[] = [];

  for (const emotion of emotions) {
    labels.push(emotionName(emotion.id));
    for (let level = 0; level < emotion.nuanceCount; level += 1) {
      labels.push(emotionNuance({ emotionId: emotion.id, intensity: 0, level }));
    }
  }

  return <Text>{labels.join('|')}</Text>;
}

test('provides localized copy for every emotion and nuance level', async () => {
  const screen = await render(<AppLocaleProvider><EmotionCatalog /></AppLocaleProvider>);
  expect(screen.getByText(/Joy\|Pleasure.*Fear\|Uncertainty.*Panic/)).toBeTruthy();
});
