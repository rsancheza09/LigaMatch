import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { forgotPassword as forgotPasswordApi } from '@shared/api/auth';

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

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      if (!email.trim()) {
        setSubmitError(t('auth.forgotPassword.email'));
        return;
      }
      setSubmitting(true);
      try {
        await forgotPasswordApi(email.trim());
        setSuccess(true);
      } catch {
        setSubmitError(t('auth.forgotPassword.error'));
      } finally {
        setSubmitting(false);
      }
    },
    [email, t]
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          title={t('auth.forgotPassword.title')}
          showBackButton
          onBackClick={() => navigate(-1)}
          backAriaLabel={t('auth.forgotPassword.back')}
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
                <EmailIcon sx={{ color: 'secondary.main', fontSize: 36 }} />
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {t('auth.forgotPassword.title')}
                </Typography>
              </Box>

              {success ? (
                <>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('auth.forgotPassword.success')}
                  </Typography>
                  <Button
                    component={Link}
                    to="/login"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                  >
                    {t('auth.forgotPassword.loginLink')}
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('auth.forgotPassword.description')}
                  </Typography>

                  <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {submitError && (
                      <Typography variant="body2" color="error">
                        {submitError}
                      </Typography>
                    )}
                    <TextField
                      label={t('auth.forgotPassword.email')}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                      required
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={submitting}
                      sx={{ mt: 2, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                    >
                      {submitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                      {t('auth.forgotPassword.rememberPassword')}{' '}
                      <Link to="/login" style={{ color: '#2e7d32', fontWeight: 600 }}>
                        {t('auth.forgotPassword.loginLink')}
                      </Link>
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
