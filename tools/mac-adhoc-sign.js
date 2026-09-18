/**
 * electron-builder afterPack kancasi: macOS uygulamasini ad-hoc imzalar.
 *
 * Apple Silicon, imzasiz ya da imzasi bozuk uygulamayi acilista oldurur.
 * electron-builder, gecerli bir sertifika bulamayinca imzalamayi tamamen
 * atliyor (ad-hoc'a dusmuyor); Electron'un kendi ad-hoc imzasi da paketleme
 * sirasinda Info.plist degistigi icin gecersizlesiyor. Buradaki "-" kimligi
 * sertifika gerektirmeyen ad-hoc imzadir: Gatekeeper yine "dogrulanamadi"
 * uyarisi verir ama uygulama "Yine de Ac" sonrasi calisir.
 */
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign({ appOutDir, packager, electronPlatformName }) {
  if (electronPlatformName !== 'darwin') return;
  const app = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  console.log(`  • ad-hoc imzalandi  ${app}`);
};
