/**
 * Tool-calling agent dongusu — dosya islemleri yalnizca AGENT_WORKSPACE icinde.
 */
const nvidia = require('./nvidia');
const { TANIMLAR, calistir } = require('./agent-tools');
const { hazirla } = require('./workspace');
const { trimReply } = require('./shared');
const { agentWorkspace } = require('./env');

const VARSAYILAN_TUR = 5;

function agentSystemPrompt(kok, kullaniciPrompt) {
  const ek = [
    '',
    '--- Dosya araclari ---',
    `Erisebildigin TEK klasor: ${kok}`,
    'Dosya islemi gerektiginde uygun araci cagir. Normal sohbette arac cagirma.',
    'Arac yollari bu klasore gore relative (ornek: "notlar/gunluk.txt").',
    'Kullaniciya Turkce, kisa cevap ver (en fazla 2-3 cumle). Islem bitince ne yaptigini soyle.'
  ].join('\n');
  return kullaniciPrompt ? `${kullaniciPrompt}\n${ek}` : ek.trim();
}

/**
 * @param {{
 *   model: string,
 *   systemPrompt?: string,
 *   messages: { role: string, content: string }[],
 *   maxTokens?: number,
 *   temperature?: number,
 *   maxToolRounds?: number,
 *   openPath: (abs: string) => Promise<string>
 * }} opts
 */
async function agentChat(opts) {
  const root = agentWorkspace();
  if (!root) {
    return { ok: false, error: 'AGENT_WORKSPACE tanimli degil. .env dosyasina klasor yolunu yazin.' };
  }

  let taban;
  try {
    taban = hazirla(root);
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }

  const {
    model,
    systemPrompt,
    messages,
    maxTokens = 256,
    temperature = 0.6,
    maxToolRounds = VARSAYILAN_TUR,
    openPath
  } = opts;

  /** @type {object[]} */
  const zincir = [
    { role: 'system', content: agentSystemPrompt(taban, systemPrompt) },
    ...messages.map((m) => ({ role: m.role, content: m.content }))
  ];

  for (let tur = 0; tur < maxToolRounds; tur++) {
    const cevap = await nvidia.complete({
      model,
      messages: zincir,
      tools: TANIMLAR,
      tool_choice: 'auto',
      maxTokens,
      temperature
    });

    if (!cevap.ok) return cevap;

    const mesaj = cevap.message;
    zincir.push(mesaj);

    const cagrilar = mesaj.tool_calls;
    if (!cagrilar?.length) {
      const metin = (mesaj.content || '').trim();
      if (!metin) return { ok: false, error: 'Model bos cevap dondurdu.' };
      return { ok: true, content: trimReply(metin, 280), provider: 'nvidia', agent: true };
    }

    for (const cagri of cagrilar) {
      const ad = cagri.function?.name;
      let args = {};
      try {
        args = JSON.parse(cagri.function?.arguments || '{}');
      } catch {
        args = {};
      }

      let icerik;
      try {
        const sonuc = await calistir(ad, args, { root: taban, openPath });
        icerik = sonuc.ok ? sonuc.sonuc : `HATA: ${sonuc.error}`;
      } catch (err) {
        icerik = `HATA: ${err.message || String(err)}`;
      }

      zincir.push({
        role: 'tool',
        tool_call_id: cagri.id,
        content: icerik
      });
    }
  }

  return {
    ok: false,
    error: `Agent ${maxToolRounds} tur sonunda tamamlanamadi. Daha kisa bir istek deneyin.`
  };
}

module.exports = { agentChat };
