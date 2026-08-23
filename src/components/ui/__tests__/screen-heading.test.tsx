import { render, screen } from '@testing-library/react-native';

import { ScreenHeading } from '@/components/ui/screen-heading';

describe('ScreenHeading', () => {
  it('composes the shared eyebrow and compact title identity', async () => {
    await render(
      <ScreenHeading.Root>
        <ScreenHeading.Eyebrow testID="eyebrow">YOUR HISTORY</ScreenHeading.Eyebrow>
        <ScreenHeading.Title size="compact">Moments you noticed.</ScreenHeading.Title>
      </ScreenHeading.Root>,
    );

    expect(screen.getByTestId('eyebrow')).toHaveStyle({ fontSize: 11, letterSpacing: 1.4 });
    expect(screen.getByText('Moments you noticed.')).toHaveStyle({ fontSize: 27, lineHeight: 33 });
  });
});
