import {
  Box,
  Button,
  Chip,
  Container,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from '@shared/theme';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { me, updateProfile } from '@shared/api/auth';
import { getMyTeams } from '@shared/api/teams';
import type { Team } from '@shared/api/teams';
import type { RootState } from '@shared/store';
import { updateUser } from '@shared/store/slices/authSlice';
import type { MeResponse } from '@shared/api/auth';

const theme = appTheme;

export type ProfilePageProps = {
  embedded?: boolean;
  onClose?: () => void;
};

export const ProfilePage = (props: ProfilePageProps = {}) => {
  const { embedded = false } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/dashboard' }, replace: true });
      return;
    }
    me()
      .then((data) => {
        setProfile(data);
        setName(data.name ?? '');
      })
      .catch(() => {
        navigate('/login', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    getMyTeams()
      .then(setMyTeams)
      .catch(() => setMyTeams([]));
  }, [isLoggedIn]);

  const participatingTournaments = useMemo(() => {
    const byTournament = new Map<
      string,
      { name: string; slugOrId: string; teams: Team[] }
    >();
    for (const team of myTeams) {
      const tid = team.tournament?.id ?? team.tournamentId;
      const name = team.tournament?.name ?? '';
      const slugOrId = team.tournament?.slug ?? team.tournamentId;
      const entry = byTournament.get(tid);
      if (!entry) {
        byTournament.set(tid, { name, slugOrId, teams: [team] });
      } else {
        entry.teams.push(team);
      }
    }
    return Array.from(byTournament.values());
  }, [myTeams]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      setSuccessMessage('');
      setSubmitting(true);
      try {
        const updated = await updateProfile(name.trim() || undefined);
        setProfile(updated);
        dispatch(updateUser({ name: updated.name }));
        setSuccessMessage(t('auth.profile.success'));
      } catch {
        setSubmitError(t('auth.profile.error'));
      } finally {
        setSubmitting(false);
      }
    },
    [name, dispatch, t]
  );

  if (!isLoggedIn || loading) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: embedded ? undefined : '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        {!embedded && (
          <AppBar
            title={t('auth.profile.title')}
            showBackButton
            onBackClick={() => navigate(-1)}
            backAriaLabel={t('auth.register.back')}
          />
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            py: { xs: 4, md: 6 },
            background: 'linear-gradient(180deg, rgba(21,101,192,0.08) 0%, rgba(255,255,255,0) 30%)',
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={0}
              sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <PersonIcon sx={{ color: 'secondary.main', fontSize: 36 }} />
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {t('auth.profile.title')}
                </Typography>
              </Box>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {t('auth.profile.description')}
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {submitError && (
                  <Typography variant="body2" color="error">
                    {submitError}
                  </Typography>
                )}
                {successMessage && (
                  <Typography variant="body2" color="success.main">
                    {successMessage}
                  </Typography>
                )}
                <TextField
                  label={t('auth.profile.email')}
                  type="email"
                  value={profile?.email ?? ''}
                  fullWidth
                  disabled
                />
                <TextField
                  label={t('auth.profile.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.profile.namePlaceholder')}
                  fullWidth
                />
                {profile?.plan && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('auth.profile.plan')}:
                    </Typography>
                    <Chip
                      label={
                        profile.plan === 'fullPro'
                          ? t('auth.profile.planFullPro')
                          : profile.plan === 'pro'
                            ? t('auth.profile.planPro')
                            : t('auth.profile.planFree')
                      }
                      size="small"
                      color={
                        profile.plan === 'fullPro'
                          ? 'primary'
                          : profile.plan === 'pro'
                            ? 'secondary'
                            : 'default'
                      }
                      variant="outlined"
                    />
                  </Box>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting}
                  sx={{ mt: 2, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                >
                  {submitting ? t('auth.profile.saving') : t('auth.profile.save')}
                </Button>
              </Box>

              {participatingTournaments.length > 0 && (
                <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <EmojiEventsIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                      {t('auth.profile.participatingTournaments')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('auth.profile.participatingTournamentsDesc')}
                  </Typography>
                  <List dense disablePadding sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
                    {participatingTournaments.map(({ name: tournamentName, slugOrId, teams }) => (
                      <ListItem
                        key={slugOrId}
                        component={Link}
                        to={`/tournaments/${slugOrId}`}
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          textDecoration: 'none',
                          color: 'inherit',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 0 },
                        }}
                      >
                        <MuiLink
                          component="span"
                          underline="hover"
                          color="primary.main"
                          fontWeight={600}
                        >
                          {tournamentName}
                        </MuiLink>
                        <ListItemText
                          secondary={teams.map((t) => t.name).join(' · ')}
                          secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                          sx={{ mt: 0.25 }}
                        />
                        <Typography variant="caption" color="primary.main" sx={{ mt: 0.5 }}>
                          {t('auth.profile.viewTournament')} →
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {participatingTournaments.length === 0 && (
                <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <EmojiEventsIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('auth.profile.participatingTournaments')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('auth.profile.participatingEmpty')}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LockIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('auth.profile.changePassword')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('auth.profile.changePasswordDesc')}
                </Typography>
                <Button component={Link} to="/forgot-password" size="small" variant="text">
                  {t('auth.forgotPassword.title')}
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
