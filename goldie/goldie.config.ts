const appRoot = process['cwd']();
const locale = process.env['GOLDIE_LOCALE'] ?? 'en-US';

if (locale !== 'en-US' && locale !== 'de-DE') {
  throw new Error('GOLDIE_LOCALE must be en-US or de-DE.');
}

export const config = {
  appRoot,
  appPath:
    process.env['GOLDIE_APP_PATH'] ??
    `${process.env['HOME']}/Library/Developer/Xcode/DerivedData/Youmotion-*/Build/Products/Release-iphonesimulator/Youmotion.app`,
  bundleId: 'com.youmotion.mobile',
  devices: ['iphone-6.9'],
  locales: [locale],
  appearance: 'light',
  frame: { variant: '17-pro-blue' },
  theme: {
    background: 'linear-gradient(150deg, #E8E4D9 0%, #F4F0E8 52%, #DCE3D5 100%)',
    headlineColor: '#273328',
    subheadColor: '#5E6B52',
    fontFamily: 'DM Sans, -apple-system, system-ui, sans-serif',
    template: 'editorial',
    layout: 'classic',
  },
  store: {
    name: 'Youmotion',
    subtitle: {
        'en-US': 'Notice. Reflect. Return.',
        'de-DE': 'Wahrnehmen. Reflektieren. Zurückkehren.',
      },
    developer: 'Vastor Holding UG',
    category: 'Health & Fitness',
    ageRating: '4+',
    price: 'Free',
    description: {
      'en-US':
        'A calm, private way to notice what you feel, reflect with care, and revisit your own patterns.',
      'de-DE':
        'Eine ruhige, private Möglichkeit, Gefühle wahrzunehmen, achtsam zu reflektieren und eigene Muster wiederzuentdecken.',
    },
  },
  scenes: [
    {
      kind: 'screenshot',
      id: 'onboarding',
      flow: locale === 'de-DE' ? 'store-01-pulse-de' : 'store-01-pulse',
      headline: {
        'en-US': 'Make space for what is here',
        'de-DE': 'Raum für das, was gerade da ist',
      },
      subhead: {
        'en-US': 'Start with a feeling, without needing the perfect words.',
        'de-DE': 'Beginne mit einem Gefühl, ganz ohne die perfekten Worte.',
      },
    },
    {
      kind: 'screenshot',
      id: 'today',
      flow: 'store-02-today',
      headline: {
        'en-US': 'Notice what you feel',
        'de-DE': 'Nimm wahr, was du fühlst',
      },
      subhead: {
        'en-US': 'A gentle pulse helps you find the feeling underneath.',
        'de-DE': 'Der Gefühlspuls hilft dir, das Gefühl darunter zu finden.',
      },
    },
    {
      kind: 'screenshot',
      id: 'history',
      flow: locale === 'de-DE' ? 'store-03-history-de' : 'store-03-history',
      headline: {
        'en-US': 'Return to your moments',
        'de-DE': 'Kehre zu deinen Momenten zurück',
      },
      subhead: {
        'en-US': 'Keep a private record you can revisit whenever you need.',
        'de-DE': 'Bewahre deine privaten Momente auf und kehre jederzeit zu ihnen zurück.',
      },
    },
    {
      kind: 'screenshot',
      id: 'insights',
      flow: locale === 'de-DE' ? 'store-04-insights-de' : 'store-04-insights',
      headline: {
        'en-US': 'See your patterns',
        'de-DE': 'Erkenne deine Muster',
      },
      subhead: {
        'en-US': 'Let your own entries reveal what keeps showing up.',
        'de-DE': 'Deine eigenen Einträge zeigen dir, was immer wieder auftaucht.',
      },
    },
    {
      kind: 'screenshot',
      id: 'settings',
      flow: locale === 'de-DE' ? 'store-05-settings-de' : 'store-05-settings',
      headline: {
        'en-US': 'Keep your space private',
        'de-DE': 'Bewahre deinen Raum privat',
      },
      subhead: {
        'en-US': 'Your journal stays on your device, with control in your hands.',
        'de-DE': 'Dein Journal bleibt auf deinem Gerät und du behältst die Kontrolle.',
      },
    },
  ],
};

export default config;
