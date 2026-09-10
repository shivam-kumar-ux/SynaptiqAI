// api/gemini.js — OBSOLETE SERVERLESS API ROUTE
// SYNAPTIQAI now uses local-first architecture. All AI requests are made
// directly from the browser using the student's own configured AI provider keys.
// No developer API keys are stored or used on the server.

module.exports = async function handler(req, res) {
  return res.status(410).json({
    error: "Server API endpoint retired. SynaptiqAI is local-first. Please configure your AI provider in Settings."
  });
};
