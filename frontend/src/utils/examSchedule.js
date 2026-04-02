function makeLocalDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 10, 0, 0, 0);
}

function parsePreferredDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

export function getUpcomingIgnouExam(fromDate = new Date(), preferredExamDate = null, preferredSession = '') {
  const preferred = parsePreferredDate(preferredExamDate);
  if (preferred && preferred.getTime() >= fromDate.getTime()) {
    return {
      sessionName: String(preferredSession || 'Custom Session').trim() || 'Custom Session',
      examDate: preferred,
    };
  }

  const year = fromDate.getFullYear();

  const windows = [
    {
      name: 'January Session',
      examDate: makeLocalDate(year, 0, 15),
    },
    {
      name: 'July Session',
      examDate: makeLocalDate(year, 6, 15),
    },
    {
      name: 'January Session',
      examDate: makeLocalDate(year + 1, 0, 15),
    },
  ];

  const next = windows.find((w) => w.examDate.getTime() >= fromDate.getTime()) || windows[0];

  return {
    sessionName: next.name,
    examDate: next.examDate,
  };
}

export function getDaysUntil(dateValue, fromDate = new Date()) {
  const target = new Date(dateValue);
  const ms = target.getTime() - fromDate.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function getExamTrackerSummary(fromDate = new Date(), preferredExamDate = null, preferredSession = '') {
  const next = getUpcomingIgnouExam(fromDate, preferredExamDate, preferredSession);
  const daysLeft = getDaysUntil(next.examDate, fromDate);

  let dailyPlan = 'Aaj 2 focused sessions rakho: concepts + PYQ practice.';
  if (daysLeft <= 1) {
    dailyPlan = 'Exam eve mode: sirf PYQs, formulas, aur high-weight topics revise karo.';
  } else if (daysLeft <= 7) {
    dailyPlan = 'Next 7 din: daily 3 hours, 1 mock test alternate day, weak topics first.';
  } else if (daysLeft <= 23) {
    dailyPlan = 'Aaj se daily 2.5 hours roadmap follow karo: 60% concepts + 40% PYQs.';
  }

  return {
    sessionName: next.sessionName,
    examDate: next.examDate,
    daysLeft,
    dailyPlan,
  };
}
