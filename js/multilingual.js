// js/multilingual.js — Multilingual AI Prompt System for SYNAPTIQAI

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "hinglish", label: "Hinglish (Hindi + English)" }
];

export function applyLanguagePromptModifier(prompt, langCode = "en") {
  if (langCode === "hi") {
    return `${prompt}\n\nIMPORTANT LANGUAGE INSTRUCTION: Provide your explanations, concepts, and notes in clear, student-friendly Hindi (Devanagari script) while maintaining accurate technical terminology in English.`;
  } else if (langCode === "hinglish") {
    return `${prompt}\n\nIMPORTANT LANGUAGE INSTRUCTION: Provide explanations and notes in natural Hinglish (Hindi written using Latin/Roman script mixed with standard English terms) so Indian students can easily relate and learn. Keep technical terms clear.`;
  }
  return prompt;
}
