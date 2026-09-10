import { shouldShowUpdateControls } from '../domain/update-controls';

describe('update controls visibility', () => {
  it('shows controls in development and QA-capable store binaries', () => {
    expect(shouldShowUpdateControls({
      isDevelopment: true,
      updateChannel: 'production',
    })).toBe(true);
    expect(shouldShowUpdateControls({
      isDevelopment: false,
      updateChannel: 'testing',
    })).toBe(true);
    expect(shouldShowUpdateControls({
      isDevelopment: false,
      updateChannel: 'qa',
    })).toBe(true);
  });

  it('keeps production store binaries free of manual update controls', () => {
    expect(shouldShowUpdateControls({
      isDevelopment: false,
      updateChannel: 'production',
    })).toBe(false);
    expect(shouldShowUpdateControls({
      isDevelopment: false,
      updateChannel: null,
    })).toBe(false);
  });
});
