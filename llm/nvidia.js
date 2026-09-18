/**
 * NVIDIA Build NIM API — OpenAI uyumlu hosted inference.
 * https://integrate.api.nvidia.com/v1
 */

const { nvidiaApiKey } = require('./env');
const { trimReply } = require('./shared');

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

/** @typedef {{ role: 'user' | 'assistant' | 'system', content: string }} ChatMessage */

/**
 * @param {{ model: string, messages: object[], tools?: object[], tool_choice?: string, maxTokens?: number, temperature?: number }} opts
 * @returns {Promise<{ ok: true, message: object, provider: 'nvidia' } | { ok: false, error: string, retryable?: boolean }>}
 */
async function complete({ model, messages, tools, tool_choice, maxTokens = 256, temperature = 0.7 }) {
  const key = nvidiaApiKey();
  if (!key) {
    return {
      ok: false,
      retryable: true,
      error: 'NVIDIA_API_KEY yok. Proje kokune .env dosyasi ekleyin (bkz. .env.example).'
    };
  }

  /** @type {Record<string, unknown>} */
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
    chat_template_kwargs: { enable_thinking: false }
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = tool_choice || 'auto';
  }

  try {
    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000)
    });

    if (res.status === 429) {
      return {
        ok: false,
        retryable: true,
        error: 'NVIDIA rate limit (429). Biraz bekleyin.'
      };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let mesaj = text;
      try {
        const j = JSON.parse(text);
        mesaj = j.error?.message || j.detail || text;
      } catch { /* ham metin */ }
      return {
        ok: false,
        retryable: res.status >= 500,
        error: `NVIDIA HTTP ${res.status}${mesaj ? `: ${String(mesaj).slice(0, 200)}` : ''}`
      };
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;
    if (!message) return { ok: false, error: 'NVIDIA gecersiz yanit.' };
    return { ok: true, message, provider: 'nvidia' };
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err?.message || String(err)
    };
  }
}

/**
 * @param {{ model: string, systemPrompt?: string, messages: ChatMessage[], maxTokens?: number, temperature?: number }} opts
 * @returns {Promise<{ ok: true, content: string, provider: 'nvidia' } | { ok: false, error: string, retryable?: boolean }>}
 */
async function chat({ model, systemPrompt, messages, maxTokens = 120, temperature = 0.7 }) {
  const tam = await complete({
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ],
    maxTokens,
    temperature
  });
  if (!tam.ok) return tam;
  const content = (tam.message.content || '').trim();
  if (!content) return { ok: false, error: 'NVIDIA bos cevap dondurdu.' };
  return { ok: true, content: trimReply(content), provider: 'nvidia' };
}

function health() {
  const key = nvidiaApiKey();
  if (!key) {
    return { ok: false, error: 'NVIDIA_API_KEY tanimli degil (.env).' };
  }
  return { ok: true, provider: 'nvidia' };
}

module.exports = { chat, complete, health, NVIDIA_URL };
