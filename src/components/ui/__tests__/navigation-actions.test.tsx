import { render, screen, userEvent } from '@testing-library/react-native';

import { AppBackButton } from '@/components/ui/app-back-button';
import { SettingsActionRow } from '@/components/ui/settings-action-row';

describe('navigation actions', () => {
  it('uses a custom app back label and dispatches an enabled press', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(<AppBackButton label="Previous" onPress={onPress} testID="back" />);

    const button = screen.getByRole('button', { name: 'Previous' });
    await user.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes a disabled settings row and blocks its press', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <SettingsActionRow
        description="Manage your reminders"
        disabled
        onPress={onPress}
        testID="reminders"
        title="Reminders"
      />,
    );

    const row = screen.getByRole('button', { disabled: true });
    expect(row).toBeDisabled();
    expect(row).toHaveStyle({ opacity: 0.42 });
    await user.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });
});
