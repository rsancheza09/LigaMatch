import {
  Box,
  Button,
  Card,
  CardActionArea,
  Container,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { listTournaments } from '@shared/api/tournaments';
import type { Tournament } from '@shared/api/tournaments';

import logoUrl from '../../../assets/ligamatch-logo.png';

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

const VALID_SPORTS = ['soccer', 'futsal'] as const;

export type TournamentsBySportPageProps = {
  embedded?: boolean;
  sport?: string;
  onClose?: () => void;
};

export const TournamentsBySportPage = (props: TournamentsBySportPageProps = {}) => {
  const { embedded = false, sport: sportProp, onClose } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sport: sportParam } = useParams<{ sport: string }>();
  const sport = sportProp ?? sportParam;
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const sportKey = sport && VALID_SPORTS.includes(sport as (typeof VALID_SPORTS)[number])
    ? (sport as (typeof VALID_SPORTS)[number])
    : 'soccer';

  useEffect(() => {
    setLoading(true);
    listTournaments({ sport: sportKey })
      .then(setTournaments)
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, [sportKey]);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: embedded ? undefined : '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        {!embedded && (
          <AppBar
            title={t(`app.categories.${sportKey}`)}
            showBackButton
            onBackClick={() => navigate('/')}
            backAriaLabel={t('tournament.create.back')}
          />
        )}

        <Box component="main" sx={{ flex: 1, py: 4 }}>
          <Container maxWidth="md">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => (embedded ? (onClose?.() ?? navigate('/dashboard')) : navigate('/'))}
              sx={{ mb: 3, textTransform: 'none' }}
            >
              {t('tournament.create.back')}
            </Button>

            <Typography variant="h4" fontWeight={600} color="primary.main" sx={{ mb: 1 }}>
              {t(`app.categories.${sportKey}`)}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {t(`app.categories.${sportKey}Desc`)}
            </Typography>

            {loading ? (
              <Typography color="text.secondary">{t('app.tournaments.loading')}</Typography>
            ) : tournaments.length === 0 ? (
              <Typography color="text.secondary">{t('app.tournaments.empty')}</Typography>
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
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: 'primary.light',
                        bgcolor: 'rgba(21,101,192,0.04)',
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() =>
                        navigate(`/tournaments/${tournament.isPublic ? tournament.slug : tournament.id}`)
                      }
                      sx={{ p: 2, display: 'block', textAlign: 'left' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                        <Box
                          component="img"
                          src={tournament.logoUrl || logoUrl}
                          alt={tournament.name}
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            objectFit: tournament.logoUrl ? 'cover' : 'contain',
                            p: tournament.logoUrl ? 0 : 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={600} noWrap>
                            {tournament.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t(`tournament.create.sport.options.${tournament.sport}`) || tournament.sport}
                            {tournament.location && ` · ${tournament.location}`}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="primary.main" fontWeight={600}>
                        {t('tournament.detail.viewPage')} →
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
