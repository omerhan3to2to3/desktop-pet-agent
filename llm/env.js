/**
 * .env dosyasini okur (dotenv bagimliligi yok).
 * Ana dizin: proje kokunu main.js set eder veya __dirname uzerinden bulunur.
 */
const fs = require('fs');
const path = require('path');

let yuklendi = false;

function yukle(kok) {
  if (yuklendi) return;
  yuklendi = true;
  const envPath = path.join(kok, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const satir of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = satir.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const anahtar = t.slice(0, eq).trim();
    let deger = t.slice(eq + 1).trim();
    if (
      (deger.startsWith('"') && deger.endsWith('"'))
      || (deger.startsWith("'") && deger.endsWith("'"))
    ) {
      deger = deger.slice(1, -1);
    }
    if (!(anahtar in process.env)) process.env[anahtar] = deger;
  }
}

function nvidiaApiKey() {
  return (process.env.NVIDIA_API_KEY || '').trim();
}

/** Agent'in erisebilecegi klasor — mutlak yol. */
function agentWorkspace() {
  return (process.env.AGENT_WORKSPACE || '').trim();
}

module.exports = { yukle, nvidiaApiKey, agentWorkspace };
