export default function assert(
  condition: unknown,
  message: string,
): asserts condition {
  'worklet';
  if (!condition) {
    throw new Error(message);
  }
}
