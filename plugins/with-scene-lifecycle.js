// iOS 27 aborts at launch unless the app adopts the UIScene life cycle.
// Expo SDK 57 ships `ExpoAppSceneDelegate` but its prebuild template still creates the window
// in the AppDelegate, so wire the scene delegate in here.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_IN_APP_DELEGATE =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: expected a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return cfg;

    const next = src
      .replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      )
      // ExpoAppSceneDelegate creates the window and starts React Native for each scene.
      .replace(START_IN_APP_DELEGATE, '\n');

    if (next === src || next.includes('factory.startReactNative(')) {
      throw new Error('with-scene-lifecycle: AppDelegate template changed; update the plugin');
    }
    cfg.modResults.contents = next;
    return cfg;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

module.exports = (config) => withSceneManifest(withSceneAppDelegate(config));
