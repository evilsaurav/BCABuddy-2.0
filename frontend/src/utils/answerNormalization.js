export const normalizeChoice = (value) => {
  return String(value ?? '')
    .trim()
    .replace(/^[A-Da-d][)\].:\-]\s*/u, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

export const resolveCorrectAnswerText = (question) => {
  const options = Array.isArray(question?.options) ? question.options : [];
  const raw = question?.correct_answer ?? question?.correct ?? question?.answer;

  if (typeof raw === 'number' && Number.isFinite(raw) && options[raw] !== undefined) {
    return options[raw];
  }

  const rawStr = String(raw ?? '').trim();
  if (!rawStr) return '';

  const letterMatch = rawStr.match(/^([A-Da-d])$/);
  if (letterMatch) {
    const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    return options[idx] ?? rawStr;
  }

  const rawNorm = normalizeChoice(rawStr);
  const matched = options.find(opt => normalizeChoice(opt) === rawNorm);
  return matched ?? rawStr;
};

export const isAnswerCorrect = (selected, question) => {
  const correctText = resolveCorrectAnswerText(question);
  const normalizedSelected = normalizeChoice(selected);
  const normalizedCorrect = normalizeChoice(correctText);
  console.log('User:', selected, 'Correct:', correctText);
  return normalizedSelected === normalizedCorrect;
};
