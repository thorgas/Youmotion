import { IntlVariations, setupFbtee } from 'fbtee';
import { APP_LOCALES } from '@/constants';
import deDE from '@/translations/de-DE.json';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SourceCodeSettingsAction } from '../ui/source-code-settings-action';
import { openSourceCode } from '../infrastructure/source-code-browser';

jest.mock('../infrastructure/source-code-browser', () => ({ openSourceCode: jest.fn() }));
const mockOpen = jest.mocked(openSourceCode);

describe('Settings source code action', () => {
  beforeEach(() => {
    setupFbtee({ translations: {}, hooks: { getViewerContext: () => ({ GENDER: IntlVariations.GENDER_UNKNOWN, locale: APP_LOCALES.ENGLISH }) } });
    mockOpen.mockReset().mockResolvedValue();
  });
  it('offers the repository action without a development flag', async () => {
    const screen = await render(<SourceCodeSettingsAction />);
    expect(screen.getByText('Source code')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('open-source-code'));
    await waitFor(() => expect(mockOpen).toHaveBeenCalledTimes(1));
  });
  it('renders the German repository action and localized recovery controls', async () => {
    setupFbtee({ translations: deDE, hooks: { getViewerContext: () => ({ GENDER: IntlVariations.GENDER_UNKNOWN, locale: APP_LOCALES.GERMAN }) } });
    mockOpen.mockRejectedValueOnce(new Error('offline'));
    const screen = await render(<SourceCodeSettingsAction />);
    expect(screen.getByText('Quellcode')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('open-source-code'));
    await waitFor(() => expect(screen.getByText('Das Repository konnte nicht geöffnet werden. Bitte versuche es erneut.')).toBeTruthy());
    expect(screen.getByText('Schließen')).toBeTruthy();
    expect(screen.getByText('Erneut versuchen')).toBeTruthy();
  });
  it('shows a dismissible failure and allows a retry', async () => {
    mockOpen.mockRejectedValueOnce(new Error('offline'));
    const screen = await render(<SourceCodeSettingsAction />);
    await fireEvent.press(screen.getByTestId('open-source-code'));
    await waitFor(() => expect(screen.getByTestId('source-code-error')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('dismiss-source-code-error'));
    expect(screen.queryByTestId('source-code-error')).toBeNull();
    mockOpen.mockRejectedValueOnce(new Error('offline'));
    await fireEvent.press(screen.getByTestId('open-source-code'));
    await waitFor(() => expect(screen.getByTestId('retry-source-code')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('retry-source-code'));
    await waitFor(() => expect(screen.queryByTestId('source-code-error')).toBeNull());
    expect(mockOpen).toHaveBeenCalledTimes(3);
  });
});
