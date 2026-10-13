// Expo config plugin: make the Android app trust the API server's self-signed certificate(s).
// The certificates are trusted ONLY for the listed hosts, on top of the normal system CAs.
// Several certs are supported because the server presents a different one when the client
// connects by IP without SNI (Android never sends SNI for IP addresses).
// Cleartext stays allowed for LAN development servers.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

function networkConfigXml(hosts, rawNames) {
  const domains = hosts.map((h) => `    <domain includeSubdomains="false">${h}</domain>`).join('\n');
  const anchors = rawNames.map((n) => `      <certificates src="@raw/${n}" />`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config>
${domains}
    <trust-anchors>
${anchors}
      <certificates src="system" />
    </trust-anchors>
  </domain-config>
</network-security-config>
`;
}

module.exports = function withServerCert(config, { certPaths = [], certPath, hosts = [] } = {}) {
  const files = certPaths.length ? certPaths : certPath ? [certPath] : [];
  const rawNames = files.map((_, i) => `server_cert_${i}`);

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      fs.mkdirSync(path.join(res, 'raw'), { recursive: true });
      fs.mkdirSync(path.join(res, 'xml'), { recursive: true });
      // Remove certs from earlier builds so only the configured ones ship.
      for (const f of fs.readdirSync(path.join(res, 'raw'))) {
        if (/^server_cert.*\.pem$/.test(f)) fs.unlinkSync(path.join(res, 'raw', f));
      }
      files.forEach((file, i) => fs.copyFileSync(path.join(root, file), path.join(res, 'raw', `${rawNames[i]}.pem`)));
      fs.writeFileSync(path.join(res, 'xml', 'network_security_config.xml'), networkConfigXml(hosts, rawNames));
      return cfg;
    },
  ]);

  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
};
