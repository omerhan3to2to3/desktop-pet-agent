/**
 * Yerel Ollama sunucusuna istek gönderir (http://127.0.0.1:11434).
 * Ana süreçte çalışır; renderer CSP'den bağımsız kalır.
 */

const { trimReply } = require('./shared');

const OLLAMA_URL = 'http://127.0.0.1:11434';

/** @typedef {{ role: 'user' | 'assistant', content: string }} ChatMessage */

/**
 * @param {{ model: string, systemPrompt?: string, messages: ChatMessage[], maxTokens?: number }} opts
 * @returns {Promise<{ ok: true, content: string } | { ok: false, error: string }>}
 */
async function chat({ model, systemPrompt, messages, maxTokens = 120 }) {
  const body = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ],
    stream: false,
    options: { num_predict: maxTokens }
  };

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        error: `Ollama HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`
      };
    }

    const data = await res.json();
    const content = (data.message?.content || '').trim();
    if (!content) return { ok: false, error: 'Ollama boş cevap döndü.' };
    return { ok: true, content: trimReply(content), provider: 'ollama' };
  } catch (err) {
    const msg = err?.cause?.code === 'ECONNREFUSED' || err?.code === 'ECONNREFUSED'
      ? 'Ollama çalışmıyor. Ollama uygulamasını açıp modeli indirdiğinizden emin olun.'
      : (err?.message || String(err));
    return { ok: false, error: msg };
  }
}

/** Ollama ayakta mı, model indirilmiş mi? */
async function health(model) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, error: `Ollama HTTP ${res.status}` };
    const data = await res.json();
    const names = (data.models || []).map((m) => m.name);
    const has = names.some((n) => n === model || n.startsWith(`${model}:`));
    if (!has) {
      return {
        ok: false,
        error: `Model "${model}" bulunamadı. Terminalde: ollama pull ${model}`
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Ollama çalışmıyor.' };
  }
}

module.exports = { chat, health, OLLAMA_URL };
