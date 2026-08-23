import assert from '@/assert';

describe('assert', () => {
  it('returns when the invariant holds', () => {
    expect(() => assert(true, 'Expected the invariant to hold.')).not.toThrow();
  });

  it('throws the diagnostic message when the invariant fails', () => {
    expect(() => assert(false, 'Expected the invariant to hold.')).toThrow(
      'Expected the invariant to hold.',
    );
  });

  it('narrows values after a successful assertion', () => {
    const value: string | undefined = 'youmotion';

    assert(value !== undefined, 'Expected a value.');

    expect(value.toUpperCase()).toBe('YOUMOTION');
  });
});
