import type { TextInput } from 'react-native';

export function beginReflectionInputSession(
  input: Pick<TextInput, 'blur' | 'focus'> | null,
) {
  input?.focus();
  return () => input?.blur();
}
