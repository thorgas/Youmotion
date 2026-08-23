import { fireEvent, render, screen } from '@testing-library/react-native';

import { Dialog } from '@/components/ui/dialog';

describe('Dialog', () => {
  it('composes an outside-press dismissal surface', async () => {
    const onRequestClose = jest.fn();
    await render(
      <Dialog.Root onRequestClose={onRequestClose} testID="dialog" tone="dialog" visible>
        <Dialog.Content><></></Dialog.Content>
      </Dialog.Root>,
    );

    await fireEvent.press(screen.getByTestId('dialog-backdrop', {
      includeHiddenElements: true,
    }));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
