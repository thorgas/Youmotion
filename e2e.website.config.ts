import type { E2EConfig } from 'e2e';

export default {
  targets: [{ name: 'website', platform: 'http' }],
  tests: ['e2e/website/**/*.e2e.ts'],
  workers: 1,
  retries: 0,
  output: 'artifacts/e2e-website',
} satisfies E2EConfig;
