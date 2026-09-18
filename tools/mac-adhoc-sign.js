/**
 * electron-builder afterPack kancasi: macOS uygulamasini ad-hoc imzalar.
 *
 * Apple Silicon, imzasiz ya da imzasi bozuk uygulamayi acilista oldurur.
 * electron-builder, gecerli bir sertifika bulamayinca imzalamayi tamamen
 * atliyor (ad-hoc'a dusmuyor); Electron'un kendi ad-hoc imzasi da paketleme
 * sirasinda Info.plist degistigi icin gecersizlesiyor. Buradaki "-" kimligi
 * sertifika gerektirmeyen ad-hoc imzadir: Gatekeeper yine "dogrulanamadi"
 * uyarisi verir ama uygulama "Yine de Ac" sonrasi calisir.
 *
 * Universal derlemede kanca UC kez cagriliyor: x64 gecici paket, arm64 gecici
 * paket ve @electron/universal'in ikisini birlestirdigi nihai paket. Yalnizca
 * sonuncusu imzalanmali — gecici paketler imzalanirsa mimariye gore farklilasan
 * _CodeSignature/CodeResources dosyalari birlestirmeyi "identical SHAs"
 * hatasiyla dusuruyor (electron-builder da bu yuzden gecicileri imzalamiyor).
 */
const { execFileSync } = require('child_process');
const path = require('path');
const { Arch } = require('electron-builder');

exports.default = async function adhocSign({ appOutDir, packager, electronPlatformName, arch }) {
  if (electronPlatformName !== 'darwin') return;
  if (arch !== Arch.universal) {
    console.log(`  • ad-hoc imza atlandi (gecici ${Arch[arch]} paketi; nihai universal paket imzalanacak)`);
    return;
  }
  const app = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  console.log(`  • ad-hoc imzalandi  ${app}`);
};
