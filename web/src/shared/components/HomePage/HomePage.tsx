import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Link,
  Typography,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from '@shared/theme';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const EXCHANGE_RATE_API = 'https://cdn.moneyconvert.net/api/latest.json';

import { AppBar } from '@components/AppBar';
import type { RootState } from '@shared/store';

const theme = appTheme;

const categories = [
  {
    key: 'soccer',
    icon: SportsSoccerIcon,
    image:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80',
  },
  {
    key: 'futsal',
    icon: EmojiEventsIcon,
    image:
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80',
  },
] as const;

export const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userPlan = useSelector((state: RootState) => state.auth.user?.plan ?? 'free') as 'free' | 'pro' | 'fullPro';
  const [usdToCrc, setUsdToCrc] = useState<number | null>(null);

  useEffect(() => {
    if (isLoggedIn && window.location.hash !== '#pricing') {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    const scrollToPricingSection = () => {
      if (window.location.hash === '#pricing') {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    scrollToPricingSection();
    window.addEventListener('hashchange', scrollToPricingSection);
    return () => window.removeEventListener('hashchange', scrollToPricingSection);
  }, []);

  useEffect(() => {
    fetch(EXCHANGE_RATE_API)
      .then((res) => res.json())
      .then((data: { rates?: { CRC?: number } }) => {
        const rate = data.rates?.CRC;
        if (typeof rate === 'number') setUsdToCrc(rate);
      })
      .catch(() => setUsdToCrc(null));
  }, []);

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatCrc = (usd: number) =>
    usdToCrc != null ? Math.round(usd * usdToCrc).toLocaleString('es-CR') : null;

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar title={t('app.title')} />

        <Box
          component="main"
          sx={{
            flex: 1,
            py: { xs: 4, md: 8 },
            background:
              'linear-gradient(180deg, rgba(21,101,192,0.08) 0%, rgba(255,255,255,0) 40%)',
          }}
        >
          <Container maxWidth="lg">
            {/* Hero */}
            <Box
              sx={{
                textAlign: 'center',
                mb: { xs: 6, md: 8 },
                maxWidth: 640,
                mx: 'auto',
              }}
            >
              <Typography
                variant="h1"
                component="h1"
                color="primary.main"
                sx={{
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  mb: 2,
                  lineHeight: 1.2,
                }}
              >
                {t('app.hero.title')}
              </Typography>
              <Typography
                variant="h5"
                component="p"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  fontWeight: 400,
                  lineHeight: 1.6,
                }}
              >
                {t('app.hero.description')}
              </Typography>
              <Box
                sx={{
                  mt: 4,
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  {t('app.cta.secondary')}
                </Button>
                {!isLoggedIn && (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/register')}
                    sx={{
                      borderColor: 'secondary.main',
                      color: 'secondary.main',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      '&:hover': {
                        borderColor: 'secondary.dark',
                        bgcolor: 'rgba(46,125,50,0.08)',
                      },
                    }}
                  >
                    {t('auth.register.title')}
                  </Button>
                )}
                <Link
                  component="button"
                  variant="body2"
                  onClick={scrollToPricing}
                  sx={{
                    cursor: 'pointer',
                    mt: 1,
                    display: 'block',
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {t('app.pricing.viewPlans')} →
                </Link>
              </Box>
            </Box>

            {/* Categorías: explorar por deporte */}
            <Box sx={{ mb: { xs: 6, md: 8 } }}>
              <Typography
                variant="h4"
                component="h2"
                color="primary.main"
                sx={{ textAlign: 'center', mb: 4 }}
              >
                {t('app.categories.title')}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 3,
                  maxWidth: 720,
                  mx: 'auto',
                }}
              >
                {categories.map(({ key, icon: Icon, image }) => (
                  <Card
                    key={key}
                    elevation={2}
                    sx={{
                      overflow: 'hidden',
                      borderRadius: 3,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea onClick={() => navigate('/dashboard', { state: { section: key === 'soccer' ? 'exploreSoccer' : 'exploreFutsal' } })}>
                      <CardMedia
                        component="img"
                        height="180"
                        image={image}
                        alt={t(`app.categories.${key}`)}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ bgcolor: 'background.paper', py: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            mb: 0.5,
                          }}
                        >
                          <Icon
                            sx={{ color: 'secondary.main', fontSize: 28 }}
                          />
                          <Typography variant="h6" component="h3" fontWeight={600}>
                            {t(`app.categories.${key}`)}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ lineHeight: 1.5 }}
                        >
                          {t(`app.categories.${key}Desc`)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            </Box>

            {/* Pricing */}
            <Box id="pricing" sx={{ mb: { xs: 6, md: 8 }, scrollMarginTop: 80, overflow: 'visible' }}>
              <Typography
                variant="h4"
                component="h2"
                color="primary.main"
                sx={{ textAlign: 'center', mb: 1 }}
              >
                {t('app.pricing.title')}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textAlign: 'center', mb: 4 }}
              >
                {t('app.pricing.subtitle')}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                  gap: 3,
                  maxWidth: 960,
                  mx: 'auto',
                  overflow: 'visible',
                  pt: 2,
                }}
              >
                {/* Free */}
                <Card
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: userPlan === 'free' ? 'primary.main' : 'divider',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {isLoggedIn && userPlan === 'free' && (
                    <Box
                      component="span"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'primary.main',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        zIndex: 1,
                        boxShadow: 1,
                      }}
                    >
                      {t('app.pricing.currentPlan')}
                    </Box>
                  )}
                  <CardContent sx={{ flex: 1, py: 3, pt: isLoggedIn && userPlan === 'free' ? 4 : 3 }}>
                    <Typography variant="h6" fontWeight={600} color="primary.main">
                      {t('app.pricing.free.name')}
                    </Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography component="span" variant="h4" fontWeight={700}>
                        ${t('app.pricing.free.price')}
                      </Typography>
                      <Typography component="span" color="text.secondary">
                        {t('app.pricing.free.priceUnit')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('app.pricing.free.perTournament')}
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                      {(t('app.pricing.free.features', { returnObjects: true }) as string[]).map(
                        (f) => (
                          <li key={f}>
                            <Typography variant="body2">{f}</Typography>
                          </li>
                        )
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 3 }}
                      onClick={() => (isLoggedIn && userPlan === 'free' ? undefined : navigate('/register'))}
                      disabled={isLoggedIn && userPlan === 'free'}
                    >
                      {isLoggedIn && userPlan === 'free'
                        ? t('app.pricing.currentPlan')
                        : t('app.pricing.free.cta')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Pro */}
                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    border: '2px solid',
                    borderColor: 'secondary.main',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: 'secondary.main',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      zIndex: 1,
                      boxShadow: 1,
                    }}
                  >
                    {isLoggedIn && userPlan === 'pro'
                      ? t('app.pricing.currentPlan')
                      : t('app.pricing.pro.popular')}
                  </Box>
                  <CardContent sx={{ flex: 1, py: 3, pt: 4 }}>
                    <Typography variant="h6" fontWeight={600} color="primary.main">
                      {t('app.pricing.pro.name')}
                    </Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography component="span" variant="h4" fontWeight={700}>
                        ${t('app.pricing.pro.price')}
                      </Typography>
                      <Typography component="span" color="text.secondary">
                        {t('app.pricing.pro.priceUnit')}
                      </Typography>
                    </Box>
                    {usdToCrc != null && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('app.pricing.crcEquivalent', {
                          amount: formatCrc(4.99),
                        })}
                      </Typography>
                    )}
                    {usdToCrc == null && (
                      <Typography variant="caption" color="text.secondary">
                        {t('app.pricing.loadingRate')}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('app.pricing.pro.perTournament')}
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                      {(t('app.pricing.pro.features', { returnObjects: true }) as string[]).map(
                        (f) => (
                          <li key={f}>
                            <Typography variant="body2">{f}</Typography>
                          </li>
                        )
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ mt: 3, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                      onClick={() => (isLoggedIn && userPlan === 'pro' ? undefined : navigate('/register'))}
                      disabled={isLoggedIn && userPlan === 'pro'}
                    >
                      {isLoggedIn && userPlan === 'pro'
                        ? t('app.pricing.currentPlan')
                        : t('app.pricing.pro.cta')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Full Pro */}
                <Card
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: userPlan === 'fullPro' ? 'primary.main' : 'divider',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {isLoggedIn && userPlan === 'fullPro' && (
                    <Box
                      component="span"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'primary.main',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        zIndex: 1,
                        boxShadow: 1,
                      }}
                    >
                      {t('app.pricing.currentPlan')}
                    </Box>
                  )}
                  <CardContent sx={{ flex: 1, py: 3, pt: isLoggedIn && userPlan === 'fullPro' ? 4 : 3 }}>
                    <Typography variant="h6" fontWeight={600} color="primary.main">
                      {t('app.pricing.fullPro.name')}
                    </Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography component="span" variant="h4" fontWeight={700}>
                        ${t('app.pricing.fullPro.price')}
                      </Typography>
                      <Typography component="span" color="text.secondary">
                        {t('app.pricing.fullPro.priceUnit')}
                      </Typography>
                    </Box>
                    {usdToCrc != null && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('app.pricing.crcEquivalent', {
                          amount: formatCrc(19.99),
                        })}
                      </Typography>
                    )}
                    {usdToCrc == null && (
                      <Typography variant="caption" color="text.secondary">
                        {t('app.pricing.loadingRate')}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('app.pricing.fullPro.allTournaments')}
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                      {(t('app.pricing.fullPro.features', { returnObjects: true }) as string[]).map(
                        (f) => (
                          <li key={f}>
                            <Typography variant="body2">{f}</Typography>
                          </li>
                        )
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 3, borderColor: 'primary.main', color: 'primary.main' }}
                      onClick={() => (isLoggedIn && userPlan === 'fullPro' ? undefined : navigate('/register'))}
                      disabled={isLoggedIn && userPlan === 'fullPro'}
                    >
                      {isLoggedIn && userPlan === 'fullPro'
                        ? t('app.pricing.currentPlan')
                        : t('app.pricing.fullPro.cta')}
                    </Button>
                  </CardContent>
                </Card>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 2 }}
              >
                {t('app.pricing.rateSource')}.{' '}
                <Link
                  href="https://moneyconvert.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="inherit"
                  sx={{ fontSize: 'inherit' }}
                >
                  MoneyConvert
                </Link>
              </Typography>
            </Box>
          </Container>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 3,
            bgcolor: 'primary.dark',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Link
            component="button"
            variant="body2"
            onClick={scrollToPricing}
            sx={{
              color: 'white',
              opacity: 0.9,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block',
              mb: 1,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {t('app.pricing.viewPlans')}
          </Link>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            © {new Date().getFullYear()} {t('app.title')}. {t('app.footer.rights')}
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
