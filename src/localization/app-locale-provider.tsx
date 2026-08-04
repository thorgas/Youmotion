import { useSelector } from '@xstate/store-react';
import { Fragment, type PropsWithChildren } from 'react';

import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { configureAppLocale } from './app-locale.configuration';

const _selectLocale = (state: ReturnType<typeof appSettingsStore.getSnapshot>) => (
  state.context.locale
);

configureAppLocale(appSettingsStore);

export function AppLocaleProvider({ children }: PropsWithChildren) {
  const locale = useSelector(appSettingsStore, _selectLocale);
  return <Fragment key={locale}>{children}</Fragment>;
}

export function useAppLocale() {
  return useSelector(appSettingsStore, _selectLocale);
}
