import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve('vendor/react-native-surrealdb');
const iosArtifacts = [
  'SurrealDbRnFramework.xcframework/Info.plist',
  'SurrealDbRnFramework.xcframework/ios-arm64/libsurrealdb_rn_core.a',
  'SurrealDbRnFramework.xcframework/ios-arm64_x86_64-simulator/libsurrealdb_rn_core.a',
];
const androidArtifacts = [
  'android/src/main/jniLibs/arm64-v8a/libsurrealdb_rn_core.so',
  'android/src/main/jniLibs/armeabi-v7a/libsurrealdb_rn_core.so',
  'android/src/main/jniLibs/x86/libsurrealdb_rn_core.so',
  'android/src/main/jniLibs/x86_64/libsurrealdb_rn_core.so',
];

function requiredArtifacts() {
  if (process.env.EAS_BUILD_PLATFORM === 'ios') return iosArtifacts;
  if (process.env.EAS_BUILD_PLATFORM === 'android') return androidArtifacts;
  return [...iosArtifacts, ...androidArtifacts];
}

async function missingArtifact(relativePath) {
  try {
    const artifact = await stat(resolve(packageRoot, relativePath));
    return artifact.size === 0 ? relativePath : undefined;
  } catch {
    return relativePath;
  }
}

const missing = (await Promise.all(requiredArtifacts().map(missingArtifact))).filter(Boolean);

if (missing.length > 0) {
  console.error('The vendored react-native-surrealdb package is missing native artifacts:');
  for (const artifact of missing) console.error(`- ${artifact}`);
  console.error('Run the package release:artifacts script and refresh the vendored copy.');
  process.exitCode = 1;
} else {
  console.log('Vendored react-native-surrealdb native artifacts are complete.');
}
