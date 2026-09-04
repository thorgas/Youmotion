import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/components/ui/button';
import { actionColors } from '@/theme';

describe('Button', () => {
  it('composes an accessible action and dispatches its press', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Button.Root label="Continue" onPress={onPress} size="large" testID="continue">
        <Button.Text>Continue</Button.Text>
      </Button.Root>,
    );

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeEnabled();
    expect(button).toHaveStyle({ borderRadius: 18, minHeight: 54 });
    await user.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks presses and exposes busy state while loading', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Button.Root label="Save" loading onPress={onPress} testID="save">
        <Button.Text>Save</Button.Text>
      </Button.Root>,
    );

    const button = screen.getByRole('button', { busy: true, disabled: true, name: 'Save' });
    expect(button).toBeDisabled();
    expect(screen.getByTestId('save-loading')).toBeOnTheScreen();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('owns the destructive action identity', async () => {
    await render(
      <Button.Root label="Delete" onPress={jest.fn()} testID="delete" variant="destructive">
        <Button.Text>Delete</Button.Text>
      </Button.Root>,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveStyle({
      backgroundColor: actionColors.destructiveBackground,
    });
  });

  it('requires text to be composed inside the button root', async () => {
    await expect(render(<Button.Text>Detached</Button.Text>)).rejects.toThrow(
      'Button.Text must be rendered inside Button.Root.',
    );
  });
});
