import appConfig from '../../app.config.js';
import appJson from '../../app.json';

const CHANNEL_HEADER = 'expo-channel-name';

const applyEnvironment = (values: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

const resolvedUpdates = (environment: {
  MOBILE_UPDATE_CHANNEL?: string;
  EAS_BUILD_PROFILE?: string;
}) => {
  const previous = {
    EAS_BUILD_PROFILE: process.env['EAS_BUILD_PROFILE'],
    MOBILE_UPDATE_CHANNEL: process.env['MOBILE_UPDATE_CHANNEL'],
  };

  applyEnvironment({
    EAS_BUILD_PROFILE: environment.EAS_BUILD_PROFILE,
    MOBILE_UPDATE_CHANNEL: environment.MOBILE_UPDATE_CHANNEL,
  });

  try {
    return appConfig({ config: appJson.expo }).updates;
  } finally {
    applyEnvironment(previous);
  }
};

describe('app.config updates resolution', () => {
  it('ships a fingerprint runtime version so an update matches the binary it was built against', () => {
    expect(appJson.expo.runtimeVersion.policy).toBe('fingerprint');
  });

  it('embeds the production channel header the runtime override needs', () => {
    expect(appJson.expo.updates.requestHeaders[CHANNEL_HEADER]).toBe('production');
  });

  it('disables updates entirely for MOBILE_UPDATE_CHANNEL=none', () => {
    const updates = resolvedUpdates({
      EAS_BUILD_PROFILE: 'production',
      MOBILE_UPDATE_CHANNEL: 'none',
    });

    expect(updates?.enabled).toBe(false);
    expect(updates?.requestHeaders?.[CHANNEL_HEADER]).toBe('production');
  });

  it('subscribes to qa for MOBILE_UPDATE_CHANNEL=qa', () => {
    const updates = resolvedUpdates({
      EAS_BUILD_PROFILE: 'production',
      MOBILE_UPDATE_CHANNEL: 'qa',
    });

    expect(updates?.enabled).toBe(true);
    expect(updates?.requestHeaders?.[CHANNEL_HEADER]).toBe('qa');
  });

  it('leaves a build without a requested channel on its app.json defaults', () => {
    const updates = resolvedUpdates({});

    expect(updates?.enabled).toBeUndefined();
    expect(updates?.requestHeaders?.[CHANNEL_HEADER]).toBe('production');
  });

  it('resolves identically wherever the config is evaluated', () => {
    expect(resolvedUpdates({ EAS_BUILD_PROFILE: 'testing' })).toEqual(resolvedUpdates({}));
    expect(resolvedUpdates({ EAS_BUILD_PROFILE: 'testing', MOBILE_UPDATE_CHANNEL: 'qa' }))
      .toEqual(resolvedUpdates({ MOBILE_UPDATE_CHANNEL: 'qa' }));
  });
});
