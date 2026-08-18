import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ConfirmedPickerModal } from '../confirmed-picker-modal';

describe('ConfirmedPickerModal', () => {
  it('dismisses when the backdrop is pressed', async () => {
    const onDone = jest.fn();

    await render(
      <ConfirmedPickerModal
        doneLabel="Done"
        onDone={onDone}
        testID="picker-modal"
        title="Choose a time"
        visible
      >
        <Text>Picker</Text>
      </ConfirmedPickerModal>,
    );

    await fireEvent.press(screen.getByTestId('picker-modal-backdrop', {
      includeHiddenElements: true,
    }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
