import { OttreliteBackendTracy } from '@ottrelite/backend-wrapper-tracy';
import { Ottrelite } from '@ottrelite/core';

export function installDevelopmentTracing() {
  if (__DEV__) Ottrelite.install([OttreliteBackendTracy]);
}
