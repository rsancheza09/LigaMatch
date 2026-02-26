import {
  AppBar as MuiAppBar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Menu,
  MenuItem,
  Popover,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LanguageIcon from '@mui/icons-material/Language';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@shared/store';
import { logout } from '@shared/store/slices/authSlice';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@shared/api/notifications';
import type { Notification } from '@shared/api/notifications';

import { appBarGradient } from '@shared/theme';
import logoUrl from '../../../assets/ligamatch-logo.png';

export type AppBarProps = {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  backAriaLabel?: string;
};

const navItems = [
  { path: '/', labelKey: 'app.nav.home', icon: HomeIcon, state: undefined },
  { path: '/dashboard', labelKey: 'app.nav.soccer', icon: SportsSoccerIcon, state: { section: 'exploreSoccer' } as const },
  { path: '/dashboard', labelKey: 'app.nav.futsal', icon: EmojiEventsIcon, state: { section: 'exploreFutsal' } as const },
  { path: '/#pricing', labelKey: 'app.nav.pricing', icon: CardMembershipIcon, state: undefined },
] as const;

export const AppBar = ({
  title,
  showBackButton = false,
  onBackClick,
  backAriaLabel,
}: AppBarProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const user = useSelector((state: RootState) => state.auth.user);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const notifButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadNotificationsCount(0);
      return;
    }
    listNotifications({ limit: 1 })
      .then((res) => setUnreadNotificationsCount(res.unreadCount))
      .catch(() => setUnreadNotificationsCount(0));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!notifAnchorEl || !isLoggedIn) return;
    setLoadingNotifications(true);
    listNotifications({ limit: 30 })
      .then((res) => {
        setNotifications(res.notifications);
        setUnreadNotificationsCount(res.unreadCount);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifications(false));
  }, [notifAnchorEl, isLoggedIn]);

  const closeMenu = useCallback(() => setMenuAnchor(null), []);
  const closeUserMenu = useCallback(() => setUserMenuAnchor(null), []);
  const openNotificationsPopover = useCallback(() => {
    closeMenu();
    closeUserMenu();
    setNotifAnchorEl(notifButtonRef.current);
  }, [closeMenu, closeUserMenu]);

  const handleNotificationClick = useCallback(
    (n: Notification) => {
      const link = n.link?.trim();
      if (link?.startsWith('/')) {
        try {
          const [path, search] = link.split('?');
          const state: { section?: string; selectedTeamId?: string; conversation?: string } = {};
          if (search) {
            const params = new URLSearchParams(search);
            const section = params.get('section');
            const teamId = params.get('teamId');
            const conversation = params.get('conversation');
            if (section) state.section = section;
            if (teamId) state.selectedTeamId = teamId;
            if (conversation) state.conversation = conversation;
          }
          setNotifAnchorEl(null);
          navigate(path || '/dashboard', Object.keys(state).length > 0 ? { state } : undefined);
        } catch {
          setNotifAnchorEl(null);
          navigate(link);
        }
      } else if (link) {
        setNotifAnchorEl(null);
        window.location.href = link;
      } else {
        setNotifAnchorEl(null);
      }
      markNotificationRead(n.id)
        .then(() => {
          setNotifications((prev) => prev.filter((x) => x.id !== n.id));
          setUnreadNotificationsCount((c) => Math.max(0, c - 1));
        })
        .catch(() => {});
    },
    [navigate]
  );

  const toggleLanguage = useCallback(() => {
    const nextLang = i18n.language.startsWith('es') ? 'en' : 'es';
    i18n.changeLanguage(nextLang);
  }, [i18n]);

  const handleNav = useCallback(
    (path: string, state?: { section?: string }) => {
      closeMenu();
      navigate(path, state ? { state } : undefined);
    },
    [navigate, closeMenu]
  );

  const userLabel = user?.name || user?.email || '';

  return (
    <MuiAppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: '#01579B',
        background: appBarGradient,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
        {/* Left: back, logo, title or nav */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          {showBackButton && (
            <IconButton
              color="inherit"
              onClick={onBackClick}
              aria-label={backAriaLabel}
              sx={{ flexShrink: 0 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box
            component="button"
            type="button"
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: 0,
              background: 'none',
              cursor: 'pointer',
              padding: 0,
              '&:hover': { opacity: 0.9 },
            }}
            aria-label={t('app.nav.home')}
          >
            <Box
              component="img"
              src={logoUrl}
              alt="LigaMatch"
              sx={{ height: 36, width: 'auto', display: 'block' }}
            />
          </Box>
          {showBackButton ? (
            <Typography
              variant="h6"
              component="span"
              fontWeight={600}
              sx={{
                ml: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: { xs: '1rem', sm: '1.15rem' },
              }}
            >
              {title}
            </Typography>
          ) : !isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
              {navItems.map(({ path, state: navState, labelKey, icon: Icon }) => {
                const isSelected = path === '/' ? location.pathname === '/' : location.pathname === path && (location.state as { section?: string })?.section === navState?.section;
                return (
                  <Button
                    key={labelKey}
                    color="inherit"
                    onClick={() => navigate(path, navState ? { state: navState } : undefined)}
                    startIcon={<Icon sx={{ fontSize: 20 }} />}
                    sx={{
                      textTransform: 'none',
                      fontWeight: isSelected ? 700 : 500,
                      opacity: isSelected ? 1 : 0.9,
                      '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' },
                      borderRadius: 2,
                      px: 1.5,
                    }}
                  >
                    {t(labelKey)}
                  </Button>
                );
              })}
              {isLoggedIn && (
                <Button
                  color="inherit"
                  onClick={() => navigate('/dashboard')}
                  startIcon={<DashboardIcon sx={{ fontSize: 20 }} />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: location.pathname === '/dashboard' ? 700 : 500,
                    opacity: location.pathname === '/dashboard' ? 1 : 0.9,
                    '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' },
                    borderRadius: 2,
                    px: 1.5,
                  }}
                >
                  {t('dashboard.title')}
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Right: notifications (when logged in) + language + user menu or login */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {isLoggedIn && (
            <>
              <IconButton
                ref={notifButtonRef}
                color="inherit"
                onClick={(e) => setNotifAnchorEl(e.currentTarget)}
                size="medium"
                aria-label={t('dashboard.notifications')}
                sx={{ opacity: 0.95, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
              >
                <Badge badgeContent={unreadNotificationsCount > 0 ? unreadNotificationsCount : 0} color="error">
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
              <Popover
                open={!!notifAnchorEl}
                anchorEl={notifAnchorEl}
                onClose={() => setNotifAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    width: 360,
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: 400,
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    mt: 1.5,
                  },
                }}
              >
                <Box sx={{ py: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {t('notifications.title')}
                    </Typography>
                    {notifications.length > 0 && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          markAllNotificationsRead()
                            .then(() => {
                              setNotifications([]);
                              setUnreadNotificationsCount(0);
                            })
                            .catch(() => {});
                        }}
                        sx={{ textTransform: 'none', minWidth: 0, py: 0 }}
                      >
                        {t('notifications.markAllRead')}
                      </Button>
                    )}
                  </Box>
                  {loadingNotifications ? (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                      {t('app.myTeams.loading')}
                    </Typography>
                  ) : notifications.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                      {t('notifications.empty')}
                    </Typography>
                  ) : (
                    <List disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
                      {notifications.map((n) => (
                        <ListItemButton
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          sx={{ py: 1.25, alignItems: 'flex-start' }}
                        >
                          <ListItemText
                            primary={n.title}
                            secondary={n.body ?? undefined}
                            primaryTypographyProps={{ fontWeight: 500, variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Box>
              </Popover>
            </>
          )}
          <IconButton
            color="inherit"
            onClick={toggleLanguage}
            size="medium"
            aria-label={t('app.nav.language')}
            sx={{
              opacity: 0.95,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
            }}
          >
            <LanguageIcon fontSize="small" />
            <Typography component="span" variant="caption" sx={{ ml: 0.25, fontSize: '0.7rem' }}>
              {i18n.language.startsWith('es') ? 'EN' : 'ES'}
            </Typography>
          </IconButton>

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                aria-label={t('app.menu')}
                sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={!!menuAnchor}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    minWidth: 260,
                    mt: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  },
                }}
              >
                {navItems.map(({ path, state: navState, labelKey, icon: Icon }) => (
                  <MenuItem key={labelKey} onClick={() => handleNav(path, navState ?? undefined)}>
                    <ListItemIcon>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t(labelKey)}</ListItemText>
                  </MenuItem>
                ))}
                {isLoggedIn && (
                  <>
                    <MenuItem onClick={() => handleNav('/dashboard')}>
                      <ListItemIcon>
                        <DashboardIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>{t('dashboard.title')}</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={openNotificationsPopover}>
                      <ListItemIcon>
                        <Badge badgeContent={unreadNotificationsCount > 0 ? unreadNotificationsCount : 0} color="error">
                          <NotificationsIcon fontSize="small" />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText>{t('dashboard.notifications')}</ListItemText>
                    </MenuItem>
                  </>
                )}
                <Divider sx={{ my: 1 }} />
                {isLoggedIn && (
                  <>
                    {userLabel && (
                      <Box sx={{ px: 2, py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {userLabel}
                        </Typography>
                      </Box>
                    )}
                    <MenuItem onClick={() => handleNav('/dashboard', { section: 'profile' })}>
                      <ListItemIcon>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>{t('auth.profile.title')}</ListItemText>
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        closeMenu();
                        dispatch(logout());
                        navigate('/login', { replace: true });
                      }}
                    >
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>{t('auth.logout')}</ListItemText>
                    </MenuItem>
                  </>
                )}
                {!isLoggedIn && (
                  <MenuItem
                    onClick={() => {
                      closeMenu();
                      navigate('/login');
                    }}
                  >
                    <ListItemIcon>
                      <LoginIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('auth.login.title')}</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </>
          ) : (
            <>
              {isLoggedIn ? (
                <>
                  <Button
                    color="inherit"
                    onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                      minWidth: 0,
                      px: 1.5,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                      borderRadius: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        mr: 1,
                      }}
                    >
                      {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                    </Box>
                    <Box component="span" sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userLabel || t('app.nav.account')}
                    </Box>
                  </Button>
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={!!userMenuAnchor}
                    onClose={closeUserMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                      sx: {
                        minWidth: 220,
                        mt: 1.5,
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      },
                    }}
                  >
                    {userLabel && (
                      <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {userLabel}
                        </Typography>
                      </Box>
                    )}
                    <MenuItem
                      onClick={() => {
                        closeUserMenu();
                        navigate('/dashboard', { state: { section: 'profile' } });
                      }}
                    >
                      <ListItemIcon>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>{t('auth.profile.title')}</ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      onClick={() => {
                        closeUserMenu();
                        dispatch(logout());
                        navigate('/login', { replace: true });
                      }}
                    >
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>{t('auth.logout')}</ListItemText>
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  color="inherit"
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  startIcon={<LoginIcon />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.8)',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                    borderRadius: 2,
                  }}
                >
                  {t('auth.login.title')}
                </Button>
              )}
            </>
          )}
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};
