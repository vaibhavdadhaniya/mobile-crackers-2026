// Expo config plugin: sign release builds with the app's own keystore instead of the debug key.
// Reads <project>/keystore/key.properties (storeFile, storePassword, keyAlias, keyPassword);
// storeFile is relative to the keystore folder. Neither file is committed (see .gitignore).
// If key.properties is missing, release falls back to the debug key so the build still works.
// A plugin is needed because `expo prebuild` regenerates android/app/build.gradle.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// withReleaseSigning';

function apply(src) {
  if (src.includes(MARK)) return src;

  const loader = `${MARK}: load ../keystore/key.properties (relative to android/)
def kitKeystorePropsFile = rootProject.file("../keystore/key.properties")
def kitKeystoreProps = new Properties()
if (kitKeystorePropsFile.exists()) {
    kitKeystorePropsFile.withInputStream { kitKeystoreProps.load(it) }
}

android {`;
  if (!/^android \{/m.test(src)) throw new Error('withReleaseSigning: "android {" block not found in app/build.gradle');
  src = src.replace(/^android \{/m, loader);

  const releaseConfig = `signingConfigs {
        release {
            if (kitKeystorePropsFile.exists()) {
                storeFile new File(kitKeystorePropsFile.parentFile, kitKeystoreProps['storeFile'])
                storePassword kitKeystoreProps['storePassword']
                keyAlias kitKeystoreProps['keyAlias']
                keyPassword kitKeystoreProps['keyPassword']
            }
        }`;
  if (!/signingConfigs \{/.test(src)) throw new Error('withReleaseSigning: signingConfigs block not found');
  src = src.replace(/signingConfigs \{/, releaseConfig);

  // In buildTypes.release, swap the debug signing for the release one (when the keystore exists).
  const releaseType = /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseType.test(src.slice(src.indexOf('buildTypes')))) {
    throw new Error('withReleaseSigning: release buildType signingConfig not found');
  }
  const i = src.indexOf('buildTypes');
  src =
    src.slice(0, i) +
    src
      .slice(i)
      .replace(releaseType, '$1signingConfig kitKeystorePropsFile.exists() ? signingConfigs.release : signingConfigs.debug');
  return src;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') throw new Error('withReleaseSigning: expected a Groovy build.gradle');
    cfg.modResults.contents = apply(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.apply = apply;
