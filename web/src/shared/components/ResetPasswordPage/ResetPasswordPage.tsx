import {
  Box,
  Button,
  Container,
  FormHelperText,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LockResetIcon from '@mui/icons-material/LockReset';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { resetPassword as resetPasswordApi } from '@shared/api/auth';
import { validatePassword } from '@shared/utils/passwordValidation';

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

export const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      if (!token.trim()) {
        setSubmitError(t('auth.resetPassword.error'));
        return;
      }
      if (!passwordValidation.isValid) {
        setSubmitError(t('auth.register.passwordRequirements'));
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError(t('auth.resetPassword.passwordMismatch'));
        return;
      }
      setSubmitting(true);
      try {
        await resetPasswordApi(token.trim(), password);
        setSuccess(true);
      } catch {
        setSubmitError(t('auth.resetPassword.error'));
      } finally {
        setSubmitting(false);
      }
    },
    [token, password, confirmPassword, passwordValidation.isValid, t]
  );

  if (!token && !success) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
          <AppBar
            title={t('auth.resetPassword.title')}
            showBackButton
            onBackClick={() => navigate('/forgot-password')}
            backAriaLabel={t('auth.resetPassword.back')}
          />
          <Container maxWidth="sm" sx={{ py: 4 }}>
            <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body1" color="error" sx={{ mb: 2 }}>
                {t('auth.resetPassword.error')}
              </Typography>
              <Button component={Link} to="/forgot-password" variant="contained">
                {t('auth.forgotPassword.title')}
              </Button>
            </Paper>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          title={t('auth.resetPassword.title')}
          showBackButton
          onBackClick={() => navigate(-1)}
          backAriaLabel={t('auth.resetPassword.back')}
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
              {success ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                    <LockResetIcon sx={{ color: 'secondary.main', fontSize: 36 }} />
                    <Typography variant="h5" fontWeight={600} color="primary.main">
                      {t('auth.resetPassword.title')}
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('auth.resetPassword.success')}
                  </Typography>
                  <Button
                    component={Link}
                    to="/login"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                  >
                    {t('auth.resetPassword.loginLink')}
                  </Button>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                    <LockResetIcon sx={{ color: 'secondary.main', fontSize: 36 }} />
                    <Typography variant="h5" fontWeight={600} color="primary.main">
                      {t('auth.resetPassword.title')}
                    </Typography>
                  </Box>

                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('auth.resetPassword.description')}
                  </Typography>

                  <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {submitError && (
                      <Typography variant="body2" color="error">
                        {submitError}
                      </Typography>
                    )}
                    <TextField
                      label={t('auth.resetPassword.password')}
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
                              aria-label={showPassword ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <FormHelperText component="div" sx={{ mt: -1 }}>
                      {t('auth.register.passwordRequirements')}
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        <li>{t('auth.register.passwordMinLength')}</li>
                        <li>{t('auth.register.passwordUppercase')}</li>
                        <li>{t('auth.register.passwordLowercase')}</li>
                        <li>{t('auth.register.passwordNumber')}</li>
                        <li>{t('auth.register.passwordSpecial')}</li>
                      </Box>
                    </FormHelperText>
                    <TextField
                      label={t('auth.resetPassword.confirmPassword')}
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      fullWidth
                      required
                      error={confirmPassword.length > 0 && !passwordsMatch}
                      helperText={confirmPassword.length > 0 && !passwordsMatch ? t('auth.resetPassword.passwordMismatch') : ''}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={submitting || !passwordValidation.isValid || !passwordsMatch}
                      sx={{ mt: 2, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                    >
                      {submitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                      <Link to="/login" style={{ color: '#2e7d32', fontWeight: 600 }}>
                        {t('auth.resetPassword.loginLink')}
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
