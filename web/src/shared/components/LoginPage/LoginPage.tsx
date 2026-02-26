import {
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoginIcon from '@mui/icons-material/Login';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { login as loginApi } from '@shared/api/auth';
import { setLoggedIn } from '@shared/store/slices/authSlice';

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

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      if (!email.trim() || !password) {
        setSubmitError(t('auth.login.errorRequired'));
        return;
      }
      setSubmitting(true);
      try {
        const { token, user, teamId } = await loginApi(email.trim(), password);
        dispatch(setLoggedIn({ token, user: { ...user, teamId } }));
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : t('auth.login.error')
        );
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, dispatch, navigate, t]
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          title={t('auth.login.title')}
          showBackButton
          onBackClick={() => navigate(-1)}
          backAriaLabel={t('auth.login.back')}
        />

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
                <LoginIcon sx={{ color: 'secondary.main', fontSize: 36 }} />
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {t('auth.login.title')}
                </Typography>
              </Box>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {t('auth.login.description')}
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {submitError && (
                  <Typography variant="body2" color="error">
                    {submitError}
                  </Typography>
                )}
                <TextField
                  label={t('auth.login.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label={t('auth.login.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting}
                  sx={{ mt: 2, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                >
                  {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  <Link to="/forgot-password" style={{ color: '#1565c0', fontWeight: 500 }}>
                    {t('auth.login.forgotPasswordLink')}
                  </Link>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                  {t('auth.login.noAccount')}{' '}
                  <Link to="/register" state={{ from }} style={{ color: '#2e7d32', fontWeight: 600 }}>
                    {t('auth.login.registerLink')}
                  </Link>
                </Typography>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
