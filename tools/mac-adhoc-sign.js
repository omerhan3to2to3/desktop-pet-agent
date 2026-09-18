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
 * YETKILER (entitlements) SART: `codesign --force` mevcut imzayi sifirdan
 * uretir ve --entitlements verilmezse Electron'un hazir paketinde gelen JIT
 * yetkileri silinir. macOS 26 (Tahoe) JIT bellek izinlerini sikilastirdi;
 * yetkisiz pakette V8 daha ilk adimda `brk` ile durur (Terminal'de
 * "trace trap", Finder'da "beklenmedik sekilde kesildi"). Eski macOS bunu
 * affediyordu. build/entitlements.mac.plist electron-builder'in kendi
 * sablonunun kopyasi; --options runtime ile birlikte, sertifikali dagitimlarla
 * ayni yapilandirmayi veriyor.
 *
 * Universal derlemede kanca UC kez cagriliyor: x64 gecici paket, arm64 gecici
 * paket ve @electron/universal'in ikisini birlestirdigi nihai paket. Yalnizca
 * sonuncusu imzalanmali — gecici paketler imzalanirsa mimariye gore farklilasan
 * _CodeSignature/CodeResources dosyalari birlestirmeyi "identical SHAs"
 * hatasiyla dusuruyor (electron-builder da bu yuzden gecicileri imzalamiyor).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Arch } = require('electron-builder');

const YETKILER = path.resolve(__dirname, '..', 'build', 'entitlements.mac.plist');

exports.default = async function adhocSign({ appOutDir, packager, electronPlatformName, arch }) {
  if (electronPlatformName !== 'darwin') return;
  if (arch !== Arch.universal) {
    console.log(`  • ad-hoc imza atlandi (gecici ${Arch[arch]} paketi; nihai universal paket imzalanacak)`);
    return;
  }
  if (!fs.existsSync(YETKILER)) {
    throw new Error(`Yetki dosyasi bulunamadi: ${YETKILER}`);
  }
  const app = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('codesign', [
    '--force', '--deep', '--sign', '-',
    '--options', 'runtime',
    '--entitlements', YETKILER,
    app
  ], { stdio: 'inherit' });
  console.log(`  • ad-hoc imzalandi (hardened runtime + JIT yetkileri)  ${app}`);
};
