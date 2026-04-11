export const ACHIEVEMENT_VERSION = 1;

export const BADGE_CATALOG = [
  { id: 'first_quiz', name: 'No Cap Starter', hint: 'Finish your first quiz.', rarity: 'common' },
  { id: 'quiz_hat_trick', name: 'Quiz Demon', hint: 'Complete 3 quizzes.', rarity: 'common' },
  { id: 'perfect_quiz', name: 'Clutch Performer', hint: 'Score 100% in a quiz.', rarity: 'rare' },
  { id: 'first_exam', name: 'Boss Fight Loaded', hint: 'Finish your first exam simulator.', rarity: 'common' },
  { id: 'exam_grinder', name: 'Locked In', hint: 'Complete 5 exam attempts.', rarity: 'rare' },
  { id: 'weekly_streak_5', name: 'Sigma Streak', hint: 'Study 5 days in the last week.', rarity: 'epic' },
  { id: 'roadmap_half', name: 'Main Character Arc', hint: 'Reach 50% roadmap completion.', rarity: 'rare' },
  { id: 'roadmap_full', name: 'Aura++', hint: 'Complete 100% roadmap.', rarity: 'legendary' },
  { id: 'review_hunter', name: 'Brainrot Resistant', hint: 'Collect 10 review items.', rarity: 'rare' },
  { id: 'night_owl', name: 'Midnight Grinder', hint: 'Study after 11 PM in 3 sessions.', rarity: 'epic' },
];

const CATALOG_MAP = BADGE_CATALOG.reduce((acc, badge) => {
  acc[badge.id] = badge;
  return acc;
}, {});

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeAchievements = (value) => {
  const base = value && typeof value === 'object' ? value : {};
  const earned = ensureArray(base.earned).filter((id) => CATALOG_MAP[id]);
  const stats = base.stats && typeof base.stats === 'object' ? base.stats : {};
  const unlockedAt = base.unlocked_at && typeof base.unlocked_at === 'object' ? base.unlocked_at : {};
  return {
    version: ACHIEVEMENT_VERSION,
    earned,
    stats,
    unlocked_at: unlockedAt,
  };
};

export const computeBadgeTriggers = ({
  quizAttempts = [],
  examAttempts = [],
  studyActivity = {},
  roadmapPct = 0,
  reviewItems = [],
}) => {
  const now = new Date();
  const normalizedRoadmapPct = Number(roadmapPct) || 0;
  const triggers = new Set();

  if (quizAttempts.length >= 1) triggers.add('first_quiz');
  if (quizAttempts.length >= 3) triggers.add('quiz_hat_trick');
  if (quizAttempts.some((q) => Number(q?.percent || 0) >= 100)) triggers.add('perfect_quiz');

  if (examAttempts.length >= 1) triggers.add('first_exam');
  if (examAttempts.length >= 5) triggers.add('exam_grinder');

  const last7 = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    last7.push(d.toISOString().slice(0, 10));
  }
  const studyDays = last7.filter((day) => Number(studyActivity?.[day] || 0) > 0).length;
  if (studyDays >= 5) triggers.add('weekly_streak_5');

  if (normalizedRoadmapPct >= 50) triggers.add('roadmap_half');
  if (normalizedRoadmapPct >= 100) triggers.add('roadmap_full');

  if (reviewItems.length >= 10) triggers.add('review_hunter');

  const nightStudyCount = ensureArray(quizAttempts)
    .concat(ensureArray(examAttempts))
    .filter((entry) => {
      const at = new Date(entry?.at || 0);
      return Number.isFinite(at.getTime()) && at.getHours() >= 23;
    }).length;
  if (nightStudyCount >= 3) triggers.add('night_owl');

  return Array.from(triggers);
};

export const mergeAchievements = (currentValue, triggerIds, nowIso) => {
  const current = normalizeAchievements(currentValue);
  const nextEarnedSet = new Set(current.earned);
  const unlockedNow = [];

  for (const id of triggerIds) {
    if (!CATALOG_MAP[id]) continue;
    if (nextEarnedSet.has(id)) continue;
    nextEarnedSet.add(id);
    unlockedNow.push(id);
  }

  const unlockedAt = { ...current.unlocked_at };
  for (const id of unlockedNow) {
    unlockedAt[id] = nowIso;
  }

  return {
    updated: {
      version: ACHIEVEMENT_VERSION,
      earned: Array.from(nextEarnedSet),
      stats: current.stats,
      unlocked_at: unlockedAt,
    },
    unlockedNow,
  };
};

export const getBadgeById = (id) => CATALOG_MAP[id] || null;
