export const safeJsonParse = (value, fallback) => {
  try {
    if (value === null || value === undefined) return fallback;
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
};

export const normalizeToolKey = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/_/g, ' ');
  const normalized = raw.replace(/\s+/g, ' ');
  if (['pyq', 'pyqs', 'previous year question', 'previous year questions'].includes(normalized)) return 'pyqs';
  if (['assignment', 'assignments'].includes(normalized)) return 'assignments';
  if (['lab work', 'lab'].includes(normalized)) return 'lab work';
  if (['notes', 'note'].includes(normalized)) return 'notes';
  if (['summary', 'summaries'].includes(normalized)) return 'summary';
  if (['viva'].includes(normalized)) return 'viva';
  if (['ai code architect', 'code architect'].includes(normalized)) return 'ai code architect';
  if (['exam predictor', 'exam-predictor'].includes(normalized)) return 'exam predictor';
  if (['viva mentor', 'ai viva mentor', 'ai-viva-mentor'].includes(normalized)) return 'viva mentor';
  if (['study roadmap', 'study plan', 'roadmap'].includes(normalized)) return 'study roadmap';
  if (['cheat mode', 'cheat', 'pyq cheat'].includes(normalized)) return 'cheat mode';
  if (['performance analytics', 'performance analyzer', 'performance'].includes(normalized)) return 'performance analytics';
  if (['quiz master', 'ocr quiz', 'handwriting ocr to quiz'].includes(normalized)) return 'quiz master';
  return normalized;
};

export const normalizeSemesterNumber = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/[1-6]/);
  return match ? match[0] : '';
};

export const semesterKeyFromNumber = (numberValue) => {
  const num = normalizeSemesterNumber(numberValue);
  return num ? `Sem ${num}` : '';
};

export const parseRoadmapDays = (text) => {
  const lines = String(text || '').split('\n').map(line => String(line || '').trim()).filter(Boolean);
  const days = [];
  const seen = new Set();
  for (const line of lines) {
    const match = line.match(/^[-*•\s]*day\s*(\d{1,2})\s*[:\-\)]\s*(.+)$/i);
    if (!match) continue;
    const day = Number(match[1]);
    if (!Number.isFinite(day) || day < 1 || day > 15 || seen.has(day)) continue;
    const task = String(match[2] || '').trim();
    if (!task) continue;
    seen.add(day);
    days.push({ day, label: `Day ${day}`, task, completed: false });
  }
  return days.sort((a, b) => a.day - b.day).slice(0, 15);
};

export const parsePredictedQuestions = (text) => {
  const lines = String(text || '').split('\n').map((line) => String(line || '').trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const match = line.match(/^\s*(\d{1,2})[\).:-]\s+(.+)$/);
    if (!match) continue;
    const num = Number(match[1]);
    const question = String(match[2] || '').trim();
    if (!Number.isFinite(num) || !question) continue;
    items.push({ number: num, question });
  }
  return items.slice(0, 20);
};

export const isoDay = (d) => {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
};

export const getLastNDays = (n) => {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(isoDay(d));
  }
  return days;
};

export const getJiyaRemarkText = (score, candidateName) => {
  const pct = Number.isFinite(Number(score)) ? Number(score) : null;
  const name = String(candidateName || 'champ').trim() || 'champ';
  const isSaurav = name.toLowerCase().includes('saurav');
  if (pct === null) return `Jiya: ${name}, aaj ka mission simple hai — ek quiz, ek revision, aur ek win.`;
  if (pct >= 90) return `Jiya: ${name}, Supreme performance. Ab bas consistency — daily 30 min, aur tu unstoppable.`;
  if (pct >= 75) return `Jiya: ${name}, solid score. Ab weak topics pe 20 min focused practice — next attempt me 90+ pakka.`;
  if (pct >= 55) return `Jiya: ${name}, good effort. Ab notes revise + 10 MCQs daily. धीरे-धीरे graph upar jayega.`;
  if (isSaurav) return `Jiya: Saurav, focus! Standards slip mat hone dena. Unit 1 + 10 MCQs, abhi.`;
  return `Jiya: ${name}, tension nahi. Start small — Unit 1 + basics. Next attempt me comeback guaranteed.`;
};
