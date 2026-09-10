// js/ai-providers.js — User AI Provider Manager for SYNAPTIQAI

import { dbGetAll, dbPut, dbDelete, dbGet } from "./db.js";

// Helper to mask key for UI display
export function maskApiKey(key) {
  if (!key) return "";
  const str = String(key).trim();
  if (str.length <= 8) return "••••••••";
  return str.slice(0, 4) + "••••••••" + str.slice(-4);
}

// ── Provider 1: Google Gemini ────────────────────────────────
export class GeminiProvider {
  static id = "gemini";
  static name = "Google Gemini";
  static defaultModel = "gemini-2.0-flash";
  static availableModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

  static async testConnection(apiKey, model = GeminiProvider.defaultModel) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Respond with exactly: OK" }] }]
          })
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini connection failed (${res.status})`);
      }
      return { success: true, message: "Gemini connected successfully!" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static async generate(prompt, options, apiKey, model = GeminiProvider.defaultModel) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: options.temperature ?? 0.35,
            maxOutputTokens: options.maxOutputTokens ?? 1000
          },
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const isRateLimit = res.status === 429 || (data.error?.message || "").toLowerCase().includes("quota");
      const err = new Error(data.error?.message || `Gemini failed (${res.status})`);
      err.isRetryable = isRateLimit || res.status >= 500;
      err.status = res.status;
      throw err;
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!text) throw new Error("Gemini returned empty text response.");
    return text;
  }
}

// ── Provider 2: Groq ─────────────────────────────────────────
export class GroqProvider {
  static id = "groq";
  static name = "Groq";
  static defaultModel = "llama-3.3-70b-versatile";
  static availableModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

  static async testConnection(apiKey, model = GroqProvider.defaultModel) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply OK" }],
          max_tokens: 10
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Groq connection failed (${res.status})`);
      }
      return { success: true, message: "Groq connected successfully!" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static async generate(prompt, options, apiKey, model = GroqProvider.defaultModel) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.35,
        max_tokens: options.maxOutputTokens ?? 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `Groq failed (${res.status})`);
      err.isRetryable = res.status === 429 || res.status >= 500;
      err.status = res.status;
      throw err;
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Groq returned empty text response.");
    return text;
  }
}

// ── Provider 3: OpenRouter ───────────────────────────────────
export class OpenRouterProvider {
  static id = "openrouter";
  static name = "OpenRouter";
  static defaultModel = "meta-llama/llama-3.1-8b-instruct:free";
  static availableModels = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemini-2.0-flash-lite-001",
    "anthropic/claude-3.5-haiku"
  ];

  static async testConnection(apiKey, model = OpenRouterProvider.defaultModel) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply OK" }],
          max_tokens: 10
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenRouter connection failed (${res.status})`);
      }
      return { success: true, message: "OpenRouter connected successfully!" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static async generate(prompt, options, apiKey, model = OpenRouterProvider.defaultModel) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.35,
        max_tokens: options.maxOutputTokens ?? 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `OpenRouter failed (${res.status})`);
      err.isRetryable = res.status === 429 || res.status >= 500;
      err.status = res.status;
      throw err;
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenRouter returned empty text response.");
    return text;
  }
}

// ── Provider 4: OpenAI ───────────────────────────────────────
export class OpenAIProvider {
  static id = "openai";
  static name = "OpenAI";
  static defaultModel = "gpt-4o-mini";
  static availableModels = ["gpt-4o-mini", "gpt-4o"];

  static async testConnection(apiKey, model = OpenAIProvider.defaultModel) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply OK" }],
          max_tokens: 10
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI connection failed (${res.status})`);
      }
      return { success: true, message: "OpenAI connected successfully!" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static async generate(prompt, options, apiKey, model = OpenAIProvider.defaultModel) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.35,
        max_tokens: options.maxOutputTokens ?? 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `OpenAI failed (${res.status})`);
      err.isRetryable = res.status === 429 || res.status >= 500;
      err.status = res.status;
      throw err;
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned empty text response.");
    return text;
  }
}

// ── Provider 5: Anthropic ────────────────────────────────────
export class AnthropicProvider {
  static id = "anthropic";
  static name = "Anthropic";
  static defaultModel = "claude-3-5-haiku-20241022";
  static availableModels = ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"];

  static async testConnection(apiKey, model = AnthropicProvider.defaultModel) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply OK" }],
          max_tokens: 10
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Anthropic connection failed (${res.status})`);
      }
      return { success: true, message: "Anthropic connected successfully!" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static async generate(prompt, options, apiKey, model = AnthropicProvider.defaultModel) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.35,
        max_tokens: options.maxOutputTokens ?? 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `Anthropic failed (${res.status})`);
      err.isRetryable = res.status === 429 || res.status >= 500;
      err.status = res.status;
      throw err;
    }

    const text = data?.content?.[0]?.text?.trim();
    if (!text) throw new Error("Anthropic returned empty text response.");
    return text;
  }
}

// Registered Provider Class Mapping
const PROVIDER_CLASSES = {
  gemini: GeminiProvider,
  groq: GroqProvider,
  openrouter: OpenRouterProvider,
  openai: OpenAIProvider,
  anthropic: AnthropicProvider
};

// ── Provider Manager ─────────────────────────────────────────
export class ProviderManager {
  static async getConfiguredProviders() {
    try {
      const list = await dbGetAll("aiProviders");
      return list
        .filter(p => p.enabled && p.apiKey)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    } catch {
      return [];
    }
  }

  static async saveProvider(providerData) {
    const record = {
      id: providerData.id,
      name: providerData.name,
      apiKey: providerData.apiKey,
      model: providerData.model,
      enabled: providerData.enabled ?? true,
      priority: providerData.priority ?? 1,
      lastTested: new Date().toISOString()
    };
    await dbPut("aiProviders", record);
    return record;
  }

  static async deleteProvider(providerId) {
    await dbDelete("aiProviders", providerId);
  }

  static async testProvider(id, apiKey, model) {
    const Class = PROVIDER_CLASSES[id];
    if (!Class) return { success: false, error: "Unknown provider ID." };
    return await Class.testConnection(apiKey, model);
  }

  static async generate(prompt, options = {}) {
    const activeProviders = await ProviderManager.getConfiguredProviders();

    if (activeProviders.length === 0) {
      const err = new Error("Connect your own AI provider to use AI-powered features.");
      err.isConfigRequired = true;
      throw err;
    }

    const errors = [];
    for (const p of activeProviders) {
      const Class = PROVIDER_CLASSES[p.id];
      if (!Class) continue;

      try {
        const text = await Class.generate(prompt, options, p.apiKey, p.model);
        return { text, provider: p.name, model: p.model };
      } catch (err) {
        errors.push(`${p.name}: ${err.message}`);
        // Only fallback if the error is retryable (rate limit, 500, timeout)
        if (!err.isRetryable && activeProviders.length > 1) {
          // If non-retryable error, still attempt fallback if another provider exists
        }
      }
    }

    throw new Error(`AI Request Failed. ${errors.join(" | ")}`);
  }
}
