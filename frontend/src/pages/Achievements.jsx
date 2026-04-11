import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, Chip, CircularProgress, Typography, Button } from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { API_BASE } from '../utils/apiConfig';
import { BADGE_CATALOG, normalizeAchievements } from '../utils/achievements';

const rarityColor = {
  common: 'rgba(148, 163, 184, 0.22)',
  rare: 'rgba(59, 130, 246, 0.2)',
  epic: 'rgba(168, 85, 247, 0.2)',
  legendary: 'rgba(245, 158, 11, 0.22)',
};

const AchievementsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [achievements, setAchievements] = useState(() => normalizeAchievements({}));

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }
        const res = await fetch(`${API_BASE}/profile/achievements`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAchievements(normalizeAchievements(data));
      } catch (e) {
        setError('Unable to load achievements right now.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const earned = useMemo(() => new Set(achievements.earned || []), [achievements]);
  const unlockedCount = earned.size;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        backgroundImage:
          'radial-gradient(circle at 15% 20%, var(--texture-dot) 0%, transparent 46%), radial-gradient(circle at 80% 75%, var(--texture-glow) 0%, transparent 52%)',
        p: { xs: 2, md: 3 },
      }}
    >
      <BackButton />
      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 26, md: 32 }, letterSpacing: '-0.02em' }}>
            Achievement Vault
          </Typography>
          <Typography sx={{ color: 'var(--text-soft)', mt: 0.3 }}>
            Keep streaking. Keep leveling. Keep shipping wins.
          </Typography>
        </Box>
        <Chip
          icon={<EmojiEvents sx={{ color: '#f59e0b !important' }} />}
          label={`${unlockedCount}/${BADGE_CATALOG.length} unlocked`}
          sx={{
            bgcolor: 'var(--surface-soft-strong)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-primary)',
            fontWeight: 800,
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ mt: 5, textAlign: 'center' }}>
          <CircularProgress sx={{ color: 'var(--neon-cyan)' }} />
        </Box>
      ) : error ? (
        <Card sx={{ mt: 3, p: 2, bgcolor: 'var(--surface-soft)', border: '1px solid var(--card-border)', borderRadius: '14px' }}>
          <Typography sx={{ color: '#f87171', fontWeight: 700 }}>{error}</Typography>
          <Button onClick={() => window.location.reload()} sx={{ mt: 1.2, color: 'var(--text-primary)' }}>Retry</Button>
        </Card>
      ) : (
        <Box sx={{ mt: 2.5, display: 'grid', gap: 1.2 }}>
          {BADGE_CATALOG.map((badge) => {
            const unlocked = earned.has(badge.id);
            const unlockedAt = achievements?.unlocked_at?.[badge.id];
            return (
              <Card
                key={badge.id}
                sx={{
                  p: 1.6,
                  borderRadius: '14px',
                  bgcolor: unlocked ? 'var(--surface-soft-strong)' : 'var(--surface-soft)',
                  border: unlocked ? '1px solid rgba(16,185,129,0.42)' : '1px solid var(--card-border)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{badge.name}</Typography>
                    <Typography sx={{ color: 'var(--text-soft)', fontSize: 13 }}>{badge.hint}</Typography>
                    {unlockedAt && (
                      <Typography sx={{ mt: 0.4, color: 'var(--text-soft)', fontSize: 12 }}>
                        Unlocked on {new Date(unlockedAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    size="small"
                    label={unlocked ? 'Unlocked' : badge.rarity}
                    sx={{
                      textTransform: 'capitalize',
                      bgcolor: unlocked ? 'rgba(16,185,129,0.16)' : (rarityColor[badge.rarity] || 'var(--surface-soft-strong)'),
                      color: unlocked ? '#34d399' : 'var(--text-secondary)',
                      border: unlocked ? '1px solid rgba(16,185,129,0.42)' : '1px solid var(--card-border)',
                      fontWeight: 700,
                    }}
                  />
                </Box>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default AchievementsPage;
