import { IntlVariations, setupFbtee } from 'fbtee';

import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import deDE from '@/translations/de-DE.json';

export function configureAppLocale(store: typeof appSettingsStore) {
  setupFbtee({
    translations: deDE,
    hooks: {
      getViewerContext: () => ({
        GENDER: IntlVariations.GENDER_UNKNOWN,
        locale: store.getSnapshot().context.locale,
      }),
    },
  });
}
