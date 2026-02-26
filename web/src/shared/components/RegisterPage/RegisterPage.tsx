import {
  Box,
  Button,
  Container,
  FormHelperText,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { getInvitationByToken } from '@shared/api/teams';
import { register as registerApi, registerByInvite } from '@shared/api/auth';
import { setLoggedIn } from '@shared/store/slices/authSlice';
import { validatePassword } from '@shared/utils/passwordValidation';

const RECAPTCHA_SITE_KEY =
  (typeof process !== 'undefined' && process.env?.RECAPTCHA_SITE_KEY) ||
  '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1565c0',
      light: '#42a5f5',
      dark: '#0d47a1',
    },
    secondary: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
});

export const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const inviteToken = searchParams.get('invite');
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    teamName: string;
    tournamentName: string;
  } | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    if (inviteToken) {
      getInvitationByToken(inviteToken)
        .then((data) => {
          setInviteInfo({ email: data.email, teamName: data.teamName, tournamentName: data.tournamentName });
          setEmail(data.email);
        })
        .catch(() => setInviteInfo(null));
    }
  }, [inviteToken]);
  const [recaptchaError, setRecaptchaError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password]
  );
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const onRecaptchaChange = useCallback((token: string | null) => {
    setRecaptchaToken(token);
    setRecaptchaError('');
  }, []);

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
        <AppBar
          title={t('auth.register.title')}
          showBackButton
          onBackClick={() => navigate(-1)}
          backAriaLabel={t('auth.register.back')}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            py: { xs: 4, md: 6 },
            background:
              'linear-gradient(180deg, rgba(21,101,192,0.08) 0%, rgba(255,255,255,0) 30%)',
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 4,
                }}
              >
                <PersonAddIcon
                  sx={{ color: 'secondary.main', fontSize: 36 }}
                />
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {t('auth.register.title')}
                </Typography>
              </Box>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {inviteInfo
                  ? t('team.invite.registerDescription', {
                      team: inviteInfo.teamName,
                      tournament: inviteInfo.tournamentName,
                    })
                  : t('auth.register.description')}
              </Typography>

              <Box
                component="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPasswordError('');
                  setRecaptchaError('');
                  setSubmitError('');
                  if (!passwordValidation.isValid) {
                    setPasswordError(t('auth.register.passwordRequirements'));
                    return;
                  }
                  if (password !== confirmPassword) {
                    setPasswordError(t('auth.register.passwordMismatch'));
                    return;
                  }
                  if (!inviteToken && !recaptchaToken) {
                    setRecaptchaError(t('auth.register.recaptchaRequired'));
                    return;
                  }
                  setSubmitting(true);
                  try {
                    if (inviteToken) {
                      const { token, user, teamId } = await registerByInvite(
                        email.trim(),
                        password,
                        inviteToken,
                        name.trim() || undefined
                      );
                      dispatch(setLoggedIn({ token, user }));
                      navigate(teamId ? `/teams/${teamId}` : '/', { replace: true });
                    } else {
                      const { token, user } = await registerApi(
                        email.trim(),
                        password,
                        name.trim() || undefined
                      );
                      dispatch(setLoggedIn({ token, user }));
                      navigate(from, { replace: true });
                    }
                  } catch (err) {
                    setSubmitError(
                      err instanceof Error ? err.message : t('auth.register.error')
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {submitError && (
                  <Typography variant="body2" color="error">
                    {submitError}
                  </Typography>
                )}
                <TextField
                  label={t('auth.register.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                  disabled={!!inviteInfo}
                  helperText={inviteInfo ? t('team.invite.emailLocked') : undefined}
                />
                <TextField
                  label={t('auth.register.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('auth.register.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  error={password.length > 0 && !passwordValidation.isValid}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ ml: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('auth.register.passwordRequirements')}
                  </Typography>
                  <Box
                    component="ul"
                    sx={{
                      m: 0,
                      pl: 2.5,
                      '& li': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                      },
                    }}
                  >
                    <li>
                      {passwordValidation.minLength ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      ) : (
                        <Box sx={{ width: 14, height: 14, border: '1px solid', borderColor: 'divider', borderRadius: '50%' }} />
                      )}
                      {t('auth.register.passwordMinLength')}
                    </li>
                    <li>
                      {passwordValidation.hasUppercase ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      ) : (
                        <Box sx={{ width: 14, height: 14, border: '1px solid', borderColor: 'divider', borderRadius: '50%' }} />
                      )}
                      {t('auth.register.passwordUppercase')}
                    </li>
                    <li>
                      {passwordValidation.hasLowercase ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      ) : (
                        <Box sx={{ width: 14, height: 14, border: '1px solid', borderColor: 'divider', borderRadius: '50%' }} />
                      )}
                      {t('auth.register.passwordLowercase')}
                    </li>
                    <li>
                      {passwordValidation.hasNumber ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      ) : (
                        <Box sx={{ width: 14, height: 14, border: '1px solid', borderColor: 'divider', borderRadius: '50%' }} />
                      )}
                      {t('auth.register.passwordNumber')}
                    </li>
                    <li>
                      {passwordValidation.hasSpecial ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      ) : (
                        <Box sx={{ width: 14, height: 14, border: '1px solid', borderColor: 'divider', borderRadius: '50%' }} />
                      )}
                      {t('auth.register.passwordSpecial')}
                    </li>
                  </Box>
                </Box>
                <TextField
                  label={t('auth.register.confirmPassword')}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                  error={confirmPassword.length > 0 && !passwordsMatch}
                  helperText={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? t('auth.register.passwordMismatch')
                      : ''
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {passwordError && (
                  <FormHelperText error>{passwordError}</FormHelperText>
                )}
                {!inviteToken && (
                <Box sx={{ my: 1 }}>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={onRecaptchaChange}
                    onExpired={() => setRecaptchaToken(null)}
                    onErrored={() => setRecaptchaError(t('auth.register.recaptchaRequired'))}
                    hl={i18n.language.startsWith('es') ? 'es' : 'en'}
                  />
                  {recaptchaError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {recaptchaError}
                    </Typography>
                  )}
                </Box>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting}
                  sx={{
                    mt: 2,
                    bgcolor: 'secondary.main',
                    '&:hover': { bgcolor: 'secondary.dark' },
                  }}
                >
                  {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                  {t('auth.register.haveAccount')}{' '}
                  <Typography
                    component="span"
                    variant="body2"
                    color="primary.main"
                    sx={{
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      '&:hover': { color: 'primary.dark' },
                    }}
                    onClick={() => navigate('/login', { state: { from } })}
                  >
                    {t('auth.register.loginLink')}
                  </Typography>
                </Typography>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
