const MODEL = "gemini-pro";

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
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${apiKey}`,
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

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || "Gemini request failed."
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return res.status(502).json({ error: "Gemini returned no text." });
    }

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  }
};
