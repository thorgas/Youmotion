declare module '*.png' {
  import type { ImageProps } from 'react-native';

  const source: ImageProps['source'];
  export default source;
}
