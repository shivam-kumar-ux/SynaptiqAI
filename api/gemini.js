const DEFAULT_MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

const API_VERSIONS = ["v1beta", "v1"];

function getModelCandidates() {
  const envModel = String(process.env.GEMINI_MODEL || "").trim();
  if (!envModel) return DEFAULT_MODEL_CANDIDATES;
  return [envModel, ...DEFAULT_MODEL_CANDIDATES.filter((model) => model !== envModel)];
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server configuration is incomplete. Set GEMINI_API_KEY."
    });
  }

  const prompt = String(req.body?.prompt || "").trim();
  const temperature = Number.isFinite(req.body?.temperature)
    ? req.body.temperature
    : 0.35;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
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
              generationConfig: {
                temperature
              },
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        const data = await upstream.json().catch(() => ({}));
        if (upstream.ok) {
          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map((part) => part.text || "")
              .join("")
              .trim() || "";

          if (!text) {
            return res.status(502).json({ error: "Gemini returned no text." });
          }

          return res.status(200).json({ text });
        }

        const message = data?.error?.message || "Gemini request failed.";
        errors.push(`${version}/${model}: ${message}`);

        // Retry only for version/model compatibility errors.
        const lower = message.toLowerCase();
        const isCompatError =
          upstream.status === 404 ||
          lower.includes("not found") ||
          lower.includes("not supported") ||
          lower.includes("unsupported");

        if (!isCompatError) {
          return res.status(upstream.status).json({ error: message });
        }
      }
    }

    return res.status(502).json({
      error: `No compatible Gemini model/version found. ${errors.join(" | ")}`
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  }
};
