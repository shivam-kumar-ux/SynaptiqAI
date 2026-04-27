const DEFAULT_MODEL_CANDIDATES = ["gemini-2.0-flash", "gemini-1.5-flash"];
const API_VERSIONS = ["v1beta", "v1"];
const MAX_PROMPT_CHARS = 12000;
const MIN_OUTPUT_TOKENS = 64;
const MAX_OUTPUT_TOKENS = 2048;

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getModelCandidates() {
  const envModel = String(process.env.GEMINI_MODEL || "").trim();
  if (!envModel) return DEFAULT_MODEL_CANDIDATES;
  return [envModel, ...DEFAULT_MODEL_CANDIDATES.filter((model) => model !== envModel)];
}

function extractGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

async function callGemini(prompt, temperature, maxOutputTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "Gemini key missing." };

  const models = getModelCandidates();
  const errors = [];

  for (const version of API_VERSIONS) {
    for (const model of models) {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationConfig: { temperature, maxOutputTokens },
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await upstream.json().catch(() => ({}));
      if (upstream.ok) {
        const text = extractGeminiText(data);
        if (text) return { ok: true, provider: "gemini", text };
        errors.push(`${version}/${model}: Gemini returned no text.`);
        continue;
      }

      const message = data?.error?.message || "Gemini request failed.";
      errors.push(`${version}/${model}: ${message}`);
      const lower = message.toLowerCase();
      const isCompatError =
        upstream.status === 404 ||
        lower.includes("not found") ||
        lower.includes("not supported") ||
        lower.includes("unsupported");

      if (!isCompatError) {
        // For quota/rate/config and any non-compat hard failure, exit Gemini quickly.
        return { ok: false, reason: message, status: upstream.status, errors };
      }
    }
  }

  return {
    ok: false,
    reason: "No compatible Gemini model/version found.",
    status: 502,
    errors
  };
}

async function callGroq(prompt, temperature, maxOutputTokens) {
  const apiKey = String(process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) return { ok: false, reason: "Groq key missing." };

  const model = String(process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim();
  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return {
      ok: false,
      reason: data?.error?.message || "Groq request failed.",
      status: upstream.status
    };
  }

  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) return { ok: false, reason: "Groq returned no text.", status: 502 };
  return { ok: true, provider: "groq", text };
}

async function callOpenRouter(prompt, temperature, maxOutputTokens) {
  const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();
  if (!apiKey) return { ok: false, reason: "OpenRouter key missing." };

  const model = String(
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free"
  ).trim();
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return {
      ok: false,
      reason: data?.error?.message || "OpenRouter request failed.",
      status: upstream.status
    };
  }

  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) return { ok: false, reason: "OpenRouter returned no text.", status: 502 };
  return { ok: true, provider: "openrouter", text };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const prompt = String(req.body?.prompt || "").trim();
  const safePrompt = prompt.slice(0, MAX_PROMPT_CHARS);
  const temperature = clampNumber(req.body?.temperature, 0, 1, 0.35);
  const maxOutputTokens = clampNumber(req.body?.maxOutputTokens, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS, 800);

  if (!safePrompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const providerErrors = [];

    const geminiResult = await callGemini(safePrompt, temperature, maxOutputTokens);
    if (geminiResult.ok) return res.status(200).json({ text: geminiResult.text, provider: "gemini" });
    providerErrors.push(`gemini: ${geminiResult.reason}${geminiResult.errors?.length ? ` (${geminiResult.errors.join(" | ")})` : ""}`);

    const groqResult = await callGroq(safePrompt, temperature, maxOutputTokens);
    if (groqResult.ok) return res.status(200).json({ text: groqResult.text, provider: "groq" });
    providerErrors.push(`groq: ${groqResult.reason}`);

    const openRouterResult = await callOpenRouter(safePrompt, temperature, maxOutputTokens);
    if (openRouterResult.ok) return res.status(200).json({ text: openRouterResult.text, provider: "openrouter" });
    providerErrors.push(`openrouter: ${openRouterResult.reason}`);

    return res.status(502).json({
      error: `All AI providers failed. ${providerErrors.join(" | ")}`
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  }
};
