import { useSelector } from '@xstate/store-react';
import { IntlVariations, setupFbtee } from 'fbtee';
import { Fragment, type PropsWithChildren } from 'react';

import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import deDE from '@/translations/de-DE.json';

const _selectLocale = (state: ReturnType<typeof appSettingsStore.getSnapshot>) => (
  state.context.locale
);

setupFbtee({
  translations: deDE,
  hooks: {
    getViewerContext: () => ({
      GENDER: IntlVariations.GENDER_UNKNOWN,
      locale: appSettingsStore.getSnapshot().context.locale,
    }),
  },
});

export function AppLocaleProvider({ children }: PropsWithChildren) {
  const locale = useSelector(appSettingsStore, _selectLocale);
  return <Fragment key={locale}>{children}</Fragment>;
}

export function useAppLocale() {
  return useSelector(appSettingsStore, _selectLocale);
}
