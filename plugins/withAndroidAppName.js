// Sets the Android launcher label (strings.xml app_name) independently of expo.name, which
// also drives the iOS project name. iOS shows CFBundleDisplayName from app.json instead.
const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

module.exports = function withAndroidAppName(config, { name }) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'app_name' }, _: name }],
      cfg.modResults,
    );
    return cfg;
  });
};
