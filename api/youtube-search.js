function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findJsonBlock(html) {
  const markers = [
    "var ytInitialData = ",
    'window["ytInitialData"] = ',
    "ytInitialData = "
  ];

  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start === -1) continue;
    const jsonStart = html.indexOf("{", start + marker.length);
    if (jsonStart === -1) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = jsonStart; i < html.length; i++) {
      const ch = html[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return html.slice(jsonStart, i + 1);
        }
      }
    }
  }

  return "";
}

function collectVideoRenderers(node, results = []) {
  if (!node || typeof node !== "object") return results;
  if (Array.isArray(node)) {
    node.forEach((item) => collectVideoRenderers(item, results));
    return results;
  }
  if (node.videoRenderer) {
    results.push(node.videoRenderer);
  }
  Object.values(node).forEach((value) => collectVideoRenderers(value, results));
  return results;
}

function getTitle(renderer) {
  if (renderer?.title?.runs?.length) {
    return renderer.title.runs.map((run) => run.text || "").join("").trim();
  }
  return renderer?.title?.simpleText || "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const q = String(req.query?.q || "").trim();
  const limit = Math.max(1, Math.min(8, Number(req.query?.limit) || 5));
  if (!q) return res.status(400).json({ error: "Query is required." });

  try {
    const upstream = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept-Language": "en-US,en;q=0.9"
        }
      }
    );

    if (!upstream.ok) {
      return res.status(502).json({ error: `YouTube search failed (${upstream.status}).` });
    }

    const html = await upstream.text();
    const jsonText = findJsonBlock(html);
    if (!jsonText) {
      return res.status(502).json({ error: "Could not read YouTube search results." });
    }

    const data = JSON.parse(jsonText);
    const renderers = collectVideoRenderers(data);
    const unique = [];
    const seen = new Set();

    for (const renderer of renderers) {
      const videoId = String(renderer?.videoId || "").trim();
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      unique.push({
        videoId,
        title: decodeHtml(getTitle(renderer) || "Untitled video"),
        channel: decodeHtml(renderer?.ownerText?.runs?.map((run) => run.text || "").join("") || ""),
        duration: renderer?.lengthText?.simpleText || "",
        thumbnail: renderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      });
      if (unique.length >= limit) break;
    }

    return res.status(200).json({ videos: unique });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  }
};
