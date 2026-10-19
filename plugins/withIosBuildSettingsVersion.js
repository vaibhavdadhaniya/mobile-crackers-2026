const { withInfoPlist, withXcodeProject } = require('expo/config-plugins');

// Makes Info.plist read the version from Xcode build settings instead of
// hard-coded values, so the version can also be changed in Xcode's General tab:
//   CFBundleVersion            = $(CURRENT_PROJECT_VERSION)  <- ios.buildNumber
//   CFBundleShortVersionString = $(MARKETING_VERSION)        <- expo.version
module.exports = function withIosBuildSettingsVersion(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleVersion = '$(CURRENT_PROJECT_VERSION)';
    cfg.modResults.CFBundleShortVersionString = '$(MARKETING_VERSION)';
    return cfg;
  });

  return withXcodeProject(config, (cfg) => {
    const version = cfg.version ?? '1.0.0';
    const buildNumber = cfg.ios?.buildNumber ?? '1';
    const configurations = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const settings = configurations[key].buildSettings;
      // Only the app target's configurations carry a bundle identifier.
      if (!settings || !settings.PRODUCT_BUNDLE_IDENTIFIER) continue;
      settings.MARKETING_VERSION = version;
      settings.CURRENT_PROJECT_VERSION = buildNumber;
    }
    return cfg;
  });
};
