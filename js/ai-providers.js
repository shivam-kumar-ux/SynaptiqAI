// js/ai-providers.js — User AI Provider Manager for SYNAPTIQAI

import { dbGetAll, dbPut, dbDelete, dbGet, dbGetByIndex } from "./db.js";
import { getCurrentUser } from "./auth.js";

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
      if (!apiKey) throw new Error("API Key is required.");
      let activeModel = model || GeminiProvider.defaultModel;
      
      let res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Reply OK" }] }]
          })
        }
      );

      // Fallback model check if 404 (model not found on specific API key tier)
      if (!res.ok && res.status === 404) {
        activeModel = "gemini-1.5-flash";
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Reply OK" }] }]
            })
          }
        );
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini connection failed (HTTP ${res.status})`);
      }
      return { success: true, message: `Gemini (${activeModel}) connected successfully!` };
    } catch (e) {
      return { success: false, error: e.message || "Gemini connection failed." };
    }
  }

  static async generate(prompt, options, apiKey, model = GeminiProvider.defaultModel) {
    let activeModel = model || GeminiProvider.defaultModel;
    let res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`,
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

    if (!res.ok && res.status === 404) {
      activeModel = "gemini-1.5-flash";
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`,
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
    }

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
          model: model || GroqProvider.defaultModel,
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
        model: model || GroqProvider.defaultModel,
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

  static async testConnection(apiKey, model = OpenRouterProvider.defaultModel) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model || OpenRouterProvider.defaultModel,
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
        model: model || OpenRouterProvider.defaultModel,
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

  static async testConnection(apiKey, model = OpenAIProvider.defaultModel) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model || OpenAIProvider.defaultModel,
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
        model: model || OpenAIProvider.defaultModel,
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
          model: model || AnthropicProvider.defaultModel,
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
        model: model || AnthropicProvider.defaultModel,
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

// ── Provider 6: Custom / OpenAI Compatible Provider ──────────
export class CustomOpenAICompatibleProvider {
  static id = "custom";
  static name = "Custom AI Provider";
  static defaultModel = "custom-model";

  static async testConnection(apiKey, model = "custom-model", baseUrl = "https://api.openai.com/v1") {
    try {
      const cleanBaseUrl = String(baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
      const endpoint = cleanBaseUrl.endsWith("/chat/completions") ? cleanBaseUrl : `${cleanBaseUrl}/chat/completions`;
      
      const headers = { "Content-Type": "application/json" };
      if (apiKey && apiKey !== "none") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: model || "custom-model",
          messages: [{ role: "user", content: "Reply OK" }],
          max_tokens: 10
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Custom connection failed (${res.status})`);
      }
      return { success: true, message: "Custom provider connected successfully!" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static async generate(prompt, options, apiKey, model = "custom-model", baseUrl = "https://api.openai.com/v1") {
    const cleanBaseUrl = String(baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
    const endpoint = cleanBaseUrl.endsWith("/chat/completions") ? cleanBaseUrl : `${cleanBaseUrl}/chat/completions`;
    
    const headers = { "Content-Type": "application/json" };
    if (apiKey && apiKey !== "none") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model || "custom-model",
        temperature: options.temperature ?? 0.35,
        max_tokens: options.maxOutputTokens ?? 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `Custom AI provider failed (${res.status})`);
      err.isRetryable = res.status === 429 || res.status >= 500;
      err.status = res.status;
      throw err;
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Custom AI provider returned empty text response.");
    return text;
  }
}

// Registered Provider Class Mapping
const PROVIDER_CLASSES = {
  gemini: GeminiProvider,
  groq: GroqProvider,
  openrouter: OpenRouterProvider,
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  custom: CustomOpenAICompatibleProvider
};

// ── Provider Manager ─────────────────────────────────────────

export class ProviderManager {
  static async getConfiguredProviders() {
    try {
      const user = getCurrentUser();
      if (!user) return [];
      const list = await dbGetByIndex("aiProviders", "userId", user.id);
      return list
        .filter(p => p.enabled && p.apiKey)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    } catch {
      return [];
    }
  }

  static async saveProvider(providerData) {
    const user = getCurrentUser();
    if (!user) throw new Error("Must be logged in to save provider.");
    const pId = providerData.id || "custom";
    const record = {
      id: `${user.id}_${pId}`,
      userId: user.id,
      providerId: pId,
      name: providerData.name || pId,
      apiKey: providerData.apiKey,
      baseUrl: providerData.baseUrl || "",
      model: providerData.model || "",
      enabled: providerData.enabled ?? true,
      priority: providerData.priority ?? 1,
      lastTested: new Date().toISOString()
    };
    await dbPut("aiProviders", record);
    return record;
  }

  static async getSafeProviderList() {
    try {
      const user = getCurrentUser();
      if (!user) return [];
      const list = await dbGetByIndex("aiProviders", "userId", user.id);
      return list.map(p => ({
        id: p.providerId || p.id.replace(`${user.id}_`, ""),
        name: p.name || PROVIDER_CLASSES[p.providerId]?.name || p.providerId,
        model: p.model || PROVIDER_CLASSES[p.providerId]?.defaultModel || "",
        baseUrl: p.baseUrl || "",
        maskedKey: maskApiKey(p.apiKey),
        enabled: p.enabled ?? true,
        lastTested: p.lastTested || null
      }));
    } catch {
      return [];
    }
  }

  static async deleteProvider(providerId) {
    const user = getCurrentUser();
    if (!user) return;
    await dbDelete("aiProviders", `${user.id}_${providerId}`);
  }

  static async testProvider(id, apiKey, model, baseUrl) {
    if (id === "custom") {
      return await CustomOpenAICompatibleProvider.testConnection(apiKey, model, baseUrl);
    }
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
      const Class = PROVIDER_CLASSES[p.providerId || p.id] || CustomOpenAICompatibleProvider;

      try {
        let text = "";
        if (p.providerId === "custom" || p.id === "custom") {
          text = await CustomOpenAICompatibleProvider.generate(prompt, options, p.apiKey, p.model, p.baseUrl);
        } else {
          text = await Class.generate(prompt, options, p.apiKey, p.model);
        }
        return { text, provider: p.name, model: p.model };
      } catch (err) {
        const cleanMsg = (err.message || "").replace(/(key|bearer|token)=\s*[^\s&]+/gi, "$1=••••");
        errors.push(`${p.name}: ${cleanMsg}`);
      }
    }

    const firstErr = errors[0] || "AI request failed. Please check your AI provider configuration.";
    throw new Error(firstErr);
  }
}

export async function saveUserKey(providerId, apiKey, model, name, baseUrl) {
  const Class = PROVIDER_CLASSES[providerId];
  const provName = name || (Class ? Class.name : providerId);
  const defaultModel = model || (Class ? Class.defaultModel : "custom-model");
  return await ProviderManager.saveProvider({ id: providerId, name: provName, apiKey, model: defaultModel, baseUrl, enabled: true });
}

export async function deleteUserKey(providerId) {
  return await ProviderManager.deleteProvider(providerId);
}

export async function getSafeConfiguredProviders() {
  return await ProviderManager.getSafeProviderList();
}

export async function testProviderConnection(providerId, apiKey, model, baseUrl) {
  return await ProviderManager.testProvider(providerId, apiKey, model, baseUrl);
}
