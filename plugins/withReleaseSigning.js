// Signs release builds with our own upload keystore instead of the debug key, so installed
// APKs can be updated in place. Values come from keystore/key.properties in the project root
// (gitignored, outside android/ so prebuild never deletes it):
//   storeFile=shree-hari-release.jks   (relative to the keystore/ folder)
//   storePassword=...
//   keyAlias=shree-hari
//   keyPassword=...
// Without keystore/key.properties, release builds fall back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const LOAD_KEY_PROPERTIES = `def keystoreProperties = new Properties()
def keystorePropertiesFile = new File(rootDir.parentFile, 'keystore/key.properties')
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }
}

android {`;

const RELEASE_SIGNING_CONFIG = `
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile new File(keystorePropertiesFile.parentFile, keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
            // Some OEM installers (ColorOS/realme) fail to parse v2-only APKs when sideloaded.
            enableV1Signing true
            enableV2Signing true
        }`;

const RELEASE_BUILD_TYPE_SIGNING = /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes('keystorePropertiesFile')) return cfg;

    const next = src
      .replace(/^android \{/m, LOAD_KEY_PROPERTIES)
      .replace('signingConfigs {', `signingConfigs {${RELEASE_SIGNING_CONFIG}`)
      .replace(
        RELEASE_BUILD_TYPE_SIGNING,
        '$1signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug'
      );

    if (
      !next.includes("'keystore/key.properties'") ||
      !next.includes("storeFile new File(keystorePropertiesFile.parentFile, keystoreProperties['storeFile'])") ||
      !next.includes('signingConfigs.release')
    ) {
      throw new Error('withReleaseSigning: app/build.gradle template changed; update the plugin');
    }
    cfg.modResults.contents = next;
    return cfg;
  });
};
