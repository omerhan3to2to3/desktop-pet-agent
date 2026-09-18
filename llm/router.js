/**
 * LLM yonlendirici: once NVIDIA, basarisizsa Ollama yedegi.
 */

const nvidia = require('./nvidia');
const ollama = require('./ollama');
const { agentChat } = require('./agent');

/** @typedef {{ role: 'user' | 'assistant', content: string }} ChatMessage */

/**
 * @param {{
 *   provider?: 'nvidia' | 'ollama' | 'auto',
 *   model: string,
 *   fallback?: { provider?: 'ollama' | 'nvidia', model?: string } | null,
 *   systemPrompt?: string,
 *   messages: ChatMessage[],
 *   maxTokens?: number,
 *   temperature?: number
 * }} opts
 */
async function chat(opts) {
  const {
    provider = 'auto',
    model,
    fallback,
    systemPrompt,
    messages,
    maxTokens = 120,
    temperature = 0.7
  } = opts;

  const nvidiaFirst = provider === 'nvidia' || provider === 'auto';
  const ollamaFirst = provider === 'ollama';

  if (nvidiaFirst) {
    const birinci = await nvidia.chat({ model, systemPrompt, messages, maxTokens, temperature });
    if (birinci.ok) return birinci;
    if (fallback?.model) {
      const ikinci = await ollama.chat({
        model: fallback.model,
        systemPrompt,
        messages,
        maxTokens
      });
      if (ikinci.ok) return { ...ikinci, provider: 'ollama', fallbackUsed: true };
      return { ok: false, error: `${birinci.error}\n\nYedek (Ollama): ${ikinci.error}` };
    }
    return birinci;
  }

  if (ollamaFirst) {
    const birinci = await ollama.chat({ model, systemPrompt, messages, maxTokens });
    if (birinci.ok) return { ...birinci, provider: 'ollama' };
    if (fallback?.model && nvidia.health().ok) {
      const ikinci = await nvidia.chat({
        model: fallback.model,
        systemPrompt,
        messages,
        maxTokens,
        temperature
      });
      if (ikinci.ok) return { ...ikinci, fallbackUsed: true };
      return { ok: false, error: `${birinci.error}\n\nYedek (NVIDIA): ${ikinci.error}` };
    }
    return birinci;
  }

  return { ok: false, error: `Bilinmeyen provider: ${provider}` };
}

async function health({ provider = 'auto', model, fallbackModel } = {}) {
  if (provider === 'nvidia' || provider === 'auto') {
    const n = nvidia.health();
    if (n.ok) return { ok: true, primary: 'nvidia', model };
    if (fallbackModel) return ollama.health(fallbackModel);
    return n;
  }
  if (model) return ollama.health(model);
  return { ok: false, error: 'Model belirtilmedi.' };
}

module.exports = { chat, health, agentChat };
