/**
 * Agent'in erisebilecegi tek klasor — path traversal engellenir.
 */
const fs = require('fs');
const path = require('path');

/**
 * @param {string} root
 * @param {string} rel
 * @returns {string} mutlak, guvenli yol
 */
function coz(root, rel) {
  if (!root) throw new Error('AGENT_WORKSPACE tanimli degil (.env).');
  const taban = path.resolve(root);
  const hedef = path.resolve(taban, rel || '.');
  const goreli = path.relative(taban, hedef);
  if (goreli.startsWith('..') || path.isAbsolute(goreli)) {
    throw new Error(`Erisim reddedildi: "${rel}" calisma alani disinda.`);
  }
  return hedef;
}

/** Klasoru yoksa olusturur. */
function hazirla(root) {
  if (!root) throw new Error('AGENT_WORKSPACE tanimli degil (.env).');
  const taban = path.resolve(root);
  if (!fs.existsSync(taban)) fs.mkdirSync(taban, { recursive: true });
  return taban;
}

module.exports = { coz, hazirla };
