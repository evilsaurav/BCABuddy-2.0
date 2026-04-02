export function normalizeHinglishTranscript(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';

  return raw
    .replace(/\s+/g, ' ')
    .replace(/\bi\.g\.?\b/gi, 'IGNOU')
    .replace(/\bbca buddy\b/gi, 'BCABuddy')
    .replace(/\bsemi?ster\b/gi, 'semester')
    .replace(/\bmc q\b/gi, 'MCQ')
    .trim();
}
