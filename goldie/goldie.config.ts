const appRoot = '/Users/timhorgas/git/Youmotion';

const config = {
  appRoot,
  appPath:
    process.env['GOLDIE_APP_PATH'] ??
    `${process.env['HOME']}/Library/Developer/Xcode/DerivedData/Youmotion-*/Build/Products/Release-iphonesimulator/Youmotion.app`,
  bundleId: 'com.youmotion.mobile',
  devices: ['iphone-6.9'],
  locales: ['en-US'],
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
    subtitle: { 'en-US': 'Notice. Reflect. Return.' },
    developer: 'Vastor Holding UG',
    category: 'Health & Fitness',
    ageRating: '4+',
    price: 'Free',
    description: {
      'en-US':
        'A calm, private way to notice what you feel, reflect with care, and revisit your own patterns.',
    },
  },
  scenes: [
    {
      kind: 'screenshot',
      id: 'onboarding',
      flow: 'store-01-pulse',
      headline: { 'en-US': 'Make space for what is here' },
      subhead: { 'en-US': 'Start with a feeling, without needing the perfect words.' },
    },
    {
      kind: 'screenshot',
      id: 'today',
      flow: 'store-02-today',
      headline: { 'en-US': 'Notice what you feel' },
      subhead: { 'en-US': 'A gentle pulse helps you find the feeling underneath.' },
    },
    {
      kind: 'screenshot',
      id: 'history',
      flow: 'store-03-history',
      headline: { 'en-US': 'Return to your moments' },
      subhead: { 'en-US': 'Keep a private record you can revisit whenever you need.' },
    },
    {
      kind: 'screenshot',
      id: 'insights',
      flow: 'store-04-insights',
      headline: { 'en-US': 'See your patterns' },
      subhead: { 'en-US': 'Let your own entries reveal what keeps showing up.' },
    },
    {
      kind: 'screenshot',
      id: 'settings',
      flow: 'store-05-settings',
      headline: { 'en-US': 'Keep your space private' },
      subhead: { 'en-US': 'Your journal stays on your device, with control in your hands.' },
    },
  ],
};

export default config;
