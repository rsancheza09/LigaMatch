import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Container,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { getMyTournaments } from '@shared/api/tournaments';
import type { Tournament } from '@shared/api/tournaments';

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

export type MyTournamentsPageProps = {
  embedded?: boolean;
  onClose?: () => void;
  onNavigateToSection?: (section: string) => void;
  /** When set, clicking a tournament calls this instead of navigating to /tournaments/... */
  onSelectTournament?: (slugOrId: string) => void;
};

export const MyTournamentsPage = (props: MyTournamentsPageProps = {}) => {
  const { embedded = false, onNavigateToSection, onSelectTournament } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const goCreateTournament = () => {
    if (embedded && onNavigateToSection) onNavigateToSection('createTournament');
    else navigate('/dashboard', { state: { section: 'createTournament' } });
  };

  useEffect(() => {
    setLoading(true);
    getMyTournaments()
      .then(setTournaments)
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: embedded ? undefined : '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        {!embedded && (
          <AppBar
            title={t('app.myTournaments.title')}
            showBackButton
            onBackClick={() => navigate('/')}
            backAriaLabel={t('tournament.create.back')}
          />
        )}

        <Box component="main" sx={{ flex: 1, py: { xs: 4, md: 6 } }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h4" fontWeight={600} color="primary.main">
                {t('app.myTournaments.title')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                onClick={goCreateTournament}
                sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
              >
                {t('app.cta.primary')}
              </Button>
            </Box>

            {loading ? (
              <Typography color="text.secondary">{t('app.myTournaments.loading')}</Typography>
            ) : tournaments.length === 0 ? (
              <Card
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                }}
              >
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  {t('app.myTournaments.empty')}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={goCreateTournament}
                  sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                >
                  {t('app.cta.primary')}
                </Button>
              </Card>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {tournaments.map((tournament) => (
                  <Card
                    key={tournament.id}
                    elevation={0}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.light',
                        bgcolor: 'rgba(21,101,192,0.04)',
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        const slugOrId = tournament.isPublic ? tournament.slug : tournament.id;
                        if (embedded && onSelectTournament) {
                          onSelectTournament(slugOrId);
                        } else {
                          navigate(`/tournaments/${slugOrId}`);
                        }
                      }}
                      sx={{ p: 2, display: 'block', textAlign: 'left' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <EmojiEventsIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                        <Typography variant="subtitle1" fontWeight={600}>
                          {tournament.name}
                        </Typography>
                        {(tournament.pendingPlayerChangeRequestCount ?? 0) > 0 && (
                          <Chip
                            label={t('app.myTournaments.pendingPlayerRequests', { count: tournament.pendingPlayerChangeRequestCount })}
                            size="small"
                            sx={{
                              bgcolor: 'warning.light',
                              color: 'warning.contrastText',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        )}
                        {tournament.logoUrl || tournament.publicPageColors ? (
                          <Chip
                            label="PRO"
                            size="small"
                            sx={{
                              bgcolor: 'secondary.main',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        ) : (
                          <Chip
                            label={t('app.myTournaments.convertToPro')}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'secondary.main',
                              color: 'secondary.main',
                              fontSize: '0.7rem',
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {t(`tournament.create.sport.options.${tournament.sport}`) || tournament.sport}
                        {tournament.location && ` · ${tournament.location}`}
                      </Typography>
                      <Typography variant="body2" color="primary.main" sx={{ mt: 1, fontWeight: 600 }}>
                        {t('app.myTournaments.manage')} →
                      </Typography>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
