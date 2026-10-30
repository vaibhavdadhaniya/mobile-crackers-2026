// Pins the Android Gradle plugin version in android/build.gradle. React Native ships its own
// AGP pin (node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml), which can be
// newer than the installed Android Studio supports; Studio then refuses to sync the project.
// React Native's gradle plugin also depends on AGP transitively, so a plain classpath version
// would be upgraded back; the version is forced on the buildscript classpath instead.
const { withProjectBuildGradle } = require('expo/config-plugins');

const BUILDSCRIPT = 'buildscript {';

module.exports = function withAgpVersion(config, { version }) {
  return withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(BUILDSCRIPT)) {
      throw new Error(`withAgpVersion: ${BUILDSCRIPT} not found in android/build.gradle`);
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      BUILDSCRIPT,
      `${BUILDSCRIPT}
  configurations.classpath {
    resolutionStrategy.force('com.android.tools.build:gradle:${version}')
  }`,
    );
    return cfg;
  });
};
