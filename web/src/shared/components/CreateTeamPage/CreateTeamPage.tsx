import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GroupsIcon from '@mui/icons-material/Groups';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { createTeam, getMyTeams } from '@shared/api/teams';
import type { Team } from '@shared/api/teams';
import { getMyTournaments, getTournament } from '@shared/api/tournaments';
import type { Tournament } from '@shared/api/tournaments';
import type { RootState } from '@shared/store';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0', light: '#42a5f5', dark: '#0d47a1' },
    secondary: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20' },
    background: { default: '#ffffff', paper: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
});

export type CreateTeamPageProps = {
  /** When true, render without AppBar for embedding inside Dashboard */
  embedded?: boolean;
  /** When provided (e.g. from Dashboard), pre-select this tournament by slug or id */
  initialTournamentSlugOrId?: string | null;
  /** When embedded, called when user goes back or after success instead of navigating */
  onClose?: () => void;
};

export const CreateTeamPage = (props: CreateTeamPageProps = {}) => {
  const { embedded = false, initialTournamentSlugOrId, onClose } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tournamentParamFromUrl = searchParams.get('tournament');
  const tournamentParam = initialTournamentSlugOrId ?? tournamentParamFromUrl;
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loadingMyTeams, setLoadingMyTeams] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      if (embedded) onClose?.();
      else navigate('/login', { state: { from: '/dashboard' }, replace: true });
      return;
    }
    getMyTournaments()
      .then(setMyTournaments)
      .catch(() => setMyTournaments([]))
      .finally(() => setLoadingTournaments(false));
  }, [isLoggedIn, navigate, embedded, onClose]);

  useEffect(() => {
    if (!isLoggedIn || myTournaments.length > 0) return;
    setLoadingMyTeams(true);
    getMyTeams()
      .then(setMyTeams)
      .catch(() => setMyTeams([]))
      .finally(() => setLoadingMyTeams(false));
  }, [isLoggedIn, myTournaments.length]);

  useEffect(() => {
    if (!tournamentParam || myTournaments.length === 0) return;
    getTournament(tournamentParam)
      .then((t) => {
        const isAdmin = myTournaments.some((m) => m.id === t.id);
        if (isAdmin) setSelectedTournament(t);
      })
      .catch(() => {});
  }, [tournamentParam, myTournaments]);

  const handleSelectTournament = useCallback((tournamentId: string) => {
    if (!tournamentId) {
      setSelectedTournament(null);
      return;
    }
    const t = myTournaments.find((x) => x.id === tournamentId) ?? null;
    setSelectedTournament(t);
    setError('');
    setSuccessMessage('');
  }, [myTournaments]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTournament || !name.trim() || !ownerEmail.trim()) return;
      setError('');
      setSuccessMessage('');
      setSubmitting(true);
      try {
        const result = await createTeam(selectedTournament.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          ownerEmail: ownerEmail.trim(),
        });
        setCreatedTeamId(result.id);
        setSuccessMessage(t('team.createPage.success'));
        if (result.inviteUrl) {
          try {
            await navigator.clipboard.writeText(result.inviteUrl);
            setSuccessMessage((prev) => `${prev} ${t('team.createPage.inviteCopied')}`);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('team.createPage.error'));
      } finally {
        setSubmitting(false);
      }
    },
    [selectedTournament, name, description, ownerEmail, t]
  );

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: embedded ? undefined : '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        {!embedded && (
          <AppBar
            title={t('team.createPage.title')}
            showBackButton
            onBackClick={() => navigate(-1)}
            backAriaLabel={t('tournament.create.back')}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <GroupsIcon sx={{ color: 'secondary.main', fontSize: 36 }} />
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {t('team.createPage.title')}
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {t('team.createPage.description')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('team.createPage.onlyByInvite')} {t('team.createPage.firstTeamAligned')}
              </Typography>

              {loadingTournaments ? (
                <Typography color="text.secondary">{t('app.myTournaments.loading')}</Typography>
              ) : myTournaments.length === 0 ? (
                <Box sx={{ py: 2 }}>
                  {loadingMyTeams ? (
                    <Typography color="text.secondary">{t('app.myTeams.loading')}</Typography>
                  ) : myTeams.length > 0 ? (
                    <>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {t('team.createPage.onlyTournamentAdminCanCreate')}
                      </Typography>
                      <Button
                        component={embedded ? 'button' : Link}
                        to={embedded ? undefined : '/dashboard'}
                        variant="contained"
                        onClick={embedded ? onClose : undefined}
                        sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                      >
                        {t('team.createPage.manageYourTeams')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {t('team.createPage.invitedUserHelp')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('team.createPage.noTournaments')}
                      </Typography>
                      <Button component={Link} to="/dashboard" state={{ section: 'createTournament' }} variant="outlined">
                        {t('team.createPage.goCreateTournament')}
                      </Button>
                    </>
                  )}
                </Box>
              ) : (
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('team.createPage.selectTournament')}</InputLabel>
                    <Select
                      value={selectedTournament?.id ?? ''}
                      label={t('team.createPage.selectTournament')}
                      onChange={(e) => handleSelectTournament(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>{t('team.createPage.selectTournament')}</em>
                      </MenuItem>
                      {myTournaments.map((tournament) => (
                        <MenuItem key={tournament.id} value={tournament.id}>
                          {tournament.name}
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({t(`tournament.create.sport.options.${tournament.sport === 'futsal' ? 'futsal' : 'soccer'}`)})
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('team.createPage.selectTournamentHelp')}
                    </Typography>
                  </FormControl>

                  {selectedTournament && (
                    <>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="subtitle2" color="primary.main" fontWeight={600} sx={{ mb: 1 }}>
                          {t('team.createPage.forTournament')}: {selectedTournament.name}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                          <Chip label={t('team.createPage.sport') + ': ' + (t(`tournament.create.sport.options.${selectedTournament.sport === 'futsal' ? 'futsal' : 'soccer'}`) || selectedTournament.sport)} size="small" variant="outlined" />
                          <Chip
                            label={
                              t('team.createPage.categoryType') +
                              ': ' +
                              (selectedTournament.categoryType === 'ages'
                                ? t('team.createPage.categoryAges')
                                : selectedTournament.categoryType === 'subcategories'
                                  ? t('team.createPage.categorySubcategories')
                                  : t('team.createPage.categoryNone'))
                            }
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        {(selectedTournament.startDate || selectedTournament.endDate) && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {t('team.createPage.dates')}:{' '}
                            {[selectedTournament.startDate, selectedTournament.endDate].filter(Boolean).join(' – ')}
                          </Typography>
                        )}
                        {selectedTournament.ageCategories && selectedTournament.ageCategories.length > 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {t('team.createPage.ageCategoriesInfo')}
                          </Typography>
                        )}
                      </Paper>

                      <TextField
                        label={t('team.add.name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                      />
                      <TextField
                        label={t('team.add.description')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                      />
                      <TextField
                        label={t('team.add.ownerEmail')}
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        fullWidth
                        required
                      />

                      {error && (
                        <Typography variant="body2" color="error">
                          {error}
                        </Typography>
                      )}
                      {successMessage && (
                        <Typography variant="body2" color="success.main">
                          {successMessage}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={submitting || !name.trim() || !ownerEmail.trim()}
                          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                        >
                          {submitting ? t('team.add.submitting') : t('team.add.submit')}
                        </Button>
                        {createdTeamId && (
                          <Button
                            variant="outlined"
                            onClick={() => {
                              if (embedded && onClose) onClose();
                              else
                                navigate(
                                  `/tournaments/${selectedTournament?.isPublic ? selectedTournament?.slug : selectedTournament?.id}`
                                );
                            }}
                          >
                            {t('app.myTournaments.manage')}
                          </Button>
                        )}
                      </Box>
                    </>
                  )}
                </Box>
              )}
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

