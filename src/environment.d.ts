declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_ENABLE_TRACY?: string;
    readonly EXPO_PUBLIC_E2E?: string;
  }
}
