import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExploreIcon from '@mui/icons-material/Explore';
import GroupsIcon from '@mui/icons-material/Groups';
import MailIcon from '@mui/icons-material/Mail';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { AppBar } from '@components/AppBar';
import { CreateTeamPage } from '@components/CreateTeamPage';
import { CreateTournamentPage } from '@components/CreateTournamentPage';
import { MyTournamentsPage } from '@components/MyTournamentsPage';
import { ProfilePage } from '@components/ProfilePage';
import { TeamDetailPage } from '@components/TeamDetailPage';
import { TournamentDetailPage } from '@components/TournamentDetailPage';
import { TeamRosterPdfDialog } from '@components/TeamDetailPage/TeamRosterPdfDialog';
import { TournamentsBySportPage } from '@components/TournamentsBySportPage';
import {
  listRelatedUsers,
  listConversations,
  createOrGetConversation,
  deleteConversation,
  getMessages,
  sendMessage,
} from '@shared/api/messages';
import type {
  ConversationSummary,
  MessageItem,
} from '@shared/api/messages';
import { getMyTeams, getPlayerChangeRequest, getTeam } from '@shared/api/teams';
import type { Team } from '@shared/api/teams';
import { formatPlayerBirthDisplay, getAgeFromBirthDate } from '@shared/utils/dateUtils';
import {
  getMyTournaments,
  getTournament,
  getStandings,
  getTournamentPlayers,
  broadcastMessageToTeams,
  listTournamentBroadcasts,
  deleteTournamentBroadcast,
} from '@shared/api/tournaments';
import type {
  Tournament,
  TournamentBroadcastItem,
  TournamentPlayerRow,
  TournamentTeam,
} from '@shared/api/tournaments';
import { DEFAULT_PERSON_IMAGE_URL } from '@shared/constants/defaultPersonImage';
import type { RootState } from '@shared/store';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0', light: '#42a5f5', dark: '#0d47a1' },
    secondary: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
});

type DashboardSection =
  | 'overview'
  | 'teams'
  | 'tournaments'
  | 'teamsByTournament'
  | 'players'
  | 'messages'
  | 'createTournament'
  | 'createTeam'
  | 'exploreSoccer'
  | 'exploreFutsal'
  | 'profile';

const SIDEBAR_WIDTH = 280;

export const DashboardPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const stateSection = (location.state as { section?: DashboardSection })?.section;
  const stateConversation = (location.state as { conversation?: string })?.conversation;
  const stateCreateTeamTournament = (location.state as { createTeamTournamentSlugOrId?: string })?.createTeamTournamentSlugOrId;
  const stateTeamId = (location.state as { selectedTeamId?: string })?.selectedTeamId;
  const stateTournamentSlugOrId = (location.state as { selectedTournamentSlugOrId?: string })?.selectedTournamentSlugOrId;
  const stateTeamIdInTournament = (location.state as { selectedTeamIdInTournament?: string })?.selectedTeamIdInTournament;
  const stateFromTeamsByTournament = (location.state as { fromTeamsByTournament?: boolean })?.fromTeamsByTournament;
  const statePlayersSectionTournamentId = (location.state as { playersSectionTournamentId?: string | null })?.playersSectionTournamentId;
  const statePlayersSectionTeamId = (location.state as { playersSectionTeamId?: string | null })?.playersSectionTeamId;
  const [section, setSection] = useState<DashboardSection>(stateSection ?? 'overview');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(stateConversation ?? null);

  useEffect(() => {
    if (stateSection) setSection(stateSection);
  }, [stateSection]);
  useEffect(() => {
    if (stateConversation && stateSection === 'messages') setSelectedConversationId(stateConversation);
  }, [stateConversation, stateSection]);
  useEffect(() => {
    if (stateCreateTeamTournament) setCreateTeamTournamentSlugOrId(stateCreateTeamTournament);
  }, [stateCreateTeamTournament]);
  useEffect(() => {
    if (stateTeamId != null) setSelectedTeamId(stateTeamId);
  }, [stateTeamId]);
  useEffect(() => {
    if (stateTournamentSlugOrId) setSelectedTournamentSlugOrId(stateTournamentSlugOrId);
  }, [stateTournamentSlugOrId]);
  useEffect(() => {
    if (stateTeamIdInTournament != null) setSelectedTeamIdInTournament(stateTeamIdInTournament);
  }, [stateTeamIdInTournament]);
  useEffect(() => {
    if (stateSection === 'teams' && stateTeamId && stateTournamentSlugOrId) {
      setTeamViewTournamentSlugOrId(stateTournamentSlugOrId);
    }
  }, [stateSection, stateTeamId, stateTournamentSlugOrId]);
  // Sync from location when navigating to team view inside tournament (section tournaments + selectedTeamIdInTournament)
  useEffect(() => {
    const state = location.state as { section?: string; selectedTournamentSlugOrId?: string; selectedTeamIdInTournament?: string; selectedTeamName?: string; fromTeamsByTournament?: boolean } | null;
    if (state?.section === 'tournaments' && state?.selectedTournamentSlugOrId && state?.selectedTeamIdInTournament) {
      setSection('tournaments');
      setSelectedTournamentSlugOrId(state.selectedTournamentSlugOrId);
      setSelectedTeamIdInTournament(state.selectedTeamIdInTournament);
      setTeamViewTournamentSlugOrId(state.selectedTournamentSlugOrId);
      setTeamViewFromTeamsByTournament(!!state.fromTeamsByTournament);
    }
  }, [location.state]);
  // Sync from location when returning to players section (e.g. back from player profile)
  useEffect(() => {
    if (stateSection === 'players') {
      if (statePlayersSectionTournamentId !== undefined) setPlayersSectionTournamentId(statePlayersSectionTournamentId ?? null);
      if (statePlayersSectionTeamId !== undefined) setPlayersSectionTeamId(statePlayersSectionTeamId ?? null);
    }
  }, [stateSection, statePlayersSectionTournamentId, statePlayersSectionTeamId]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(stateTeamId ?? null);
  const [selectedTournamentSlugOrId, setSelectedTournamentSlugOrId] = useState<string | null>(stateTournamentSlugOrId ?? null);
  const [selectedTeamIdInTournament, setSelectedTeamIdInTournament] = useState<string | null>(stateTeamIdInTournament ?? null);
  const [teamViewTournamentSlugOrId, setTeamViewTournamentSlugOrId] = useState<string | null>(
    (stateSection === 'teams' && stateTeamId && stateTournamentSlugOrId ? stateTournamentSlugOrId : null) ||
    (stateSection === 'tournaments' && stateTeamIdInTournament && stateTournamentSlugOrId ? stateTournamentSlugOrId : null)
  );
  const [teamViewFromTeamsByTournament, setTeamViewFromTeamsByTournament] = useState(!!stateFromTeamsByTournament);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createTeamTournamentSlugOrId, setCreateTeamTournamentSlugOrId] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [deleteConversationDialogOpen, setDeleteConversationDialogOpen] = useState(false);
  const [conversationIdToDelete, setConversationIdToDelete] = useState<string | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [relatedUsers, setRelatedUsers] = useState<Array<{ id: string; email: string; name?: string }>>([]);
  const [loadingRelatedUsers, setLoadingRelatedUsers] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTournamentId, setBroadcastTournamentId] = useState('');
  const [broadcastTeamIds, setBroadcastTeamIds] = useState<string[]>([]);
  const [broadcastAllTeams, setBroadcastAllTeams] = useState(true);
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastTeamsList, setBroadcastTeamsList] = useState<Array<{ teamId: string; teamName: string }>>([]);
  const [broadcastSentCount, setBroadcastSentCount] = useState<number | null>(null);
  const [broadcastHistoryTournamentId, setBroadcastHistoryTournamentId] = useState('');
  const [broadcastHistory, setBroadcastHistory] = useState<TournamentBroadcastItem[]>([]);
  const [loadingBroadcastHistory, setLoadingBroadcastHistory] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState<{ tournamentId: string; broadcastId: string } | null>(null);
  const [deletingBroadcast, setDeletingBroadcast] = useState(false);
  const [tournamentsWithTeams, setTournamentsWithTeams] = useState<Record<string, { name: string; teams: Array<{ id: string; name: string; logoUrl?: string | null }> }>>({});
  const [loadingTournamentsWithTeams, setLoadingTournamentsWithTeams] = useState(false);
  const [teamsByTournamentSearch, setTeamsByTournamentSearch] = useState('');
  const [teamsByTournamentFilterSport, setTeamsByTournamentFilterSport] = useState<string>('');
  const [playersSectionTournamentId, setPlayersSectionTournamentId] = useState<string | null>(null);
  const [playersSectionTeamId, setPlayersSectionTeamId] = useState<string | null>(null);
  const [playersTournamentTeams, setPlayersTournamentTeams] = useState<TournamentTeam[] | null>(null);
  const [playersList, setPlayersList] = useState<TournamentPlayerRow[]>([]);
  const [playersTotal, setPlayersTotal] = useState(0);
  const [playersPage, setPlayersPage] = useState(1);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [rosterPdfOpen, setRosterPdfOpen] = useState(false);
  const [teamForRoster, setTeamForRoster] = useState<Team | null>(null);

  const PLAYERS_PAGE_SIZE = 10;

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/dashboard' }, replace: true });
      return;
    }
    getMyTeams()
      .then(setMyTeams)
      .catch(() => setMyTeams([]))
      .finally(() => setLoadingTeams(false));
    getMyTournaments()
      .then(setMyTournaments)
      .catch(() => setMyTournaments([]))
      .finally(() => setLoadingTournaments(false));
  }, [isLoggedIn, navigate]);

  const playerRequestIdFromUrl = searchParams.get('playerRequestId');
  useEffect(() => {
    if (!playerRequestIdFromUrl || !isLoggedIn) return;
    getPlayerChangeRequest(playerRequestIdFromUrl)
      .then((req) => {
        setSection('tournaments');
        setSelectedTournamentSlugOrId((req.tournament as { slug?: string })?.slug ?? req.tournamentId);
        setSelectedTeamIdInTournament(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('playerRequestId');
          next.delete('teamId');
          return next;
        }, { replace: true });
      })
      .catch(() => {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('playerRequestId');
          next.delete('teamId');
          return next;
        }, { replace: true });
      });
  }, [playerRequestIdFromUrl, isLoggedIn, setSearchParams]);

  useEffect(() => {
    if (section !== 'messages' || !isLoggedIn) return;
    setLoadingConversations(true);
    listConversations()
      .then((res) => setConversations(res.conversations))
      .catch(() => setConversations([]))
      .finally(() => setLoadingConversations(false));
  }, [section, isLoggedIn]);

  useEffect(() => {
    if (!selectedConversationId || !isLoggedIn) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    getMessages(selectedConversationId, { limit: 50 })
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [selectedConversationId, isLoggedIn]);

  useEffect(() => {
    if (!broadcastOpen || !broadcastTournamentId) {
      setBroadcastTeamsList([]);
      return;
    }
    getStandings(broadcastTournamentId)
      .then((res) => {
        const teams = (res.standingsGeneral ?? res.standings ?? []).map((r) => ({
          teamId: r.teamId,
          teamName: r.teamName,
        }));
        setBroadcastTeamsList(teams);
      })
      .catch(() => setBroadcastTeamsList([]));
  }, [broadcastOpen, broadcastTournamentId]);

  useEffect(() => {
    if (section !== 'messages' || !broadcastHistoryTournamentId || !isLoggedIn) {
      return;
    }
    setLoadingBroadcastHistory(true);
    listTournamentBroadcasts(broadcastHistoryTournamentId)
      .then((res) => setBroadcastHistory(res.broadcasts))
      .catch(() => setBroadcastHistory([]))
      .finally(() => setLoadingBroadcastHistory(false));
  }, [section, broadcastHistoryTournamentId, isLoggedIn]);

  useEffect(() => {
    if (section !== 'teamsByTournament' || myTournaments.length === 0) return;
    setLoadingTournamentsWithTeams(true);
    const slugOrId = (t: Tournament) => (t.isPublic ? t.slug : t.id);
    Promise.all(myTournaments.map((t) => getTournament(slugOrId(t))))
      .then((results) => {
        const map: Record<string, { name: string; teams: Array<{ id: string; name: string; logoUrl?: string | null }> }> = {};
        myTournaments.forEach((t, i) => {
          const full = results[i];
          const key = slugOrId(t);
          map[key] = {
            name: full.name,
            teams: full.teams ?? [],
          };
        });
        setTournamentsWithTeams(map);
      })
      .catch(() => setTournamentsWithTeams({}))
      .finally(() => setLoadingTournamentsWithTeams(false));
  }, [section, myTournaments]);

  useEffect(() => {
    if (!playersSectionTournamentId) {
      setPlayersTournamentTeams(null);
      setPlayersSectionTeamId(null);
      return;
    }
    getTournament(playersSectionTournamentId)
      .then((tournament) => {
        const teams = tournament.teams ?? [];
        setPlayersTournamentTeams(teams);
        setPlayersSectionTeamId((current) => {
          if (!current) return null;
          return teams.some((tt) => tt.id === current) ? current : null;
        });
      })
      .catch(() => {
        setPlayersTournamentTeams(null);
        setPlayersSectionTeamId(null);
      });
  }, [playersSectionTournamentId]);

  useEffect(() => {
    if (!playersSectionTournamentId) {
      setPlayersList([]);
      setPlayersTotal(0);
      return;
    }
    setLoadingPlayers(true);
    getTournamentPlayers(playersSectionTournamentId, {
      ...(playersSectionTeamId ? { teamId: playersSectionTeamId } : {}),
      page: playersPage,
      limit: PLAYERS_PAGE_SIZE,
    })
      .then((res) => {
        setPlayersList(res.players);
        setPlayersTotal(res.total);
      })
      .catch(() => {
        setPlayersList([]);
        setPlayersTotal(0);
      })
      .finally(() => setLoadingPlayers(false));
  }, [playersSectionTournamentId, playersSectionTeamId, playersPage]);

  /** Tournaments to show in Players section: ones I admin + ones where my teams participate (for team owners). */
  const playersSectionTournaments = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; slug: string }>();
    for (const t of myTournaments) {
      byId.set(t.id, { id: t.id, name: t.name, slug: t.slug ?? t.id });
    }
    for (const team of myTeams) {
      const tid = team.tournamentId;
      if (tid && !byId.has(tid)) {
        const t = team.tournament;
        byId.set(tid, {
          id: tid,
          name: t?.name ?? tid,
          slug: t?.slug ?? tid,
        });
      }
      for (const pt of team.participatingTournaments ?? []) {
        if (pt.id && !byId.has(pt.id)) {
          byId.set(pt.id, { id: pt.id, name: pt.name, slug: pt.slug ?? pt.id });
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [myTournaments, myTeams]);

  const filteredTeamsByTournament = useMemo(() => {
    const q = teamsByTournamentSearch.trim().toLowerCase();
    return myTournaments
      .filter((t) => !teamsByTournamentFilterSport || t.sport === teamsByTournamentFilterSport)
      .map((tournament) => {
        const key = tournament.isPublic ? tournament.slug : tournament.id;
        const data = tournamentsWithTeams[key];
        const teams = data?.teams ?? [];
        const filteredTeams = q
          ? teams.filter(
              (team) =>
                team.name.toLowerCase().includes(q) || (data?.name ?? tournament.name).toLowerCase().includes(q)
            )
          : teams;
        return { tournament, key, data, teams: filteredTeams };
      })
      .filter(({ teams }) => teams.length > 0 || !q);
  }, [myTournaments, tournamentsWithTeams, teamsByTournamentSearch, teamsByTournamentFilterSport]);

  const navState = location.state as { section?: string; selectedTeamId?: string } | null;
  const isTeamsViewFromNav = navState?.section === 'teams' && !!navState?.selectedTeamId;
  const effectiveSection = isTeamsViewFromNav ? 'teams' : section;
  const effectiveSelectedTeamId = isTeamsViewFromNav && navState?.selectedTeamId ? navState.selectedTeamId : selectedTeamId;

  // Team detail is never shown inside Mis Equipos; redirect to full page when landing with a selected team
  useEffect(() => {
    if (isLoggedIn && isTeamsViewFromNav && effectiveSelectedTeamId) {
      navigate(`/teams/${effectiveSelectedTeamId}`, { replace: true });
    }
  }, [isLoggedIn, isTeamsViewFromNav, effectiveSelectedTeamId, navigate]);

  if (!isLoggedIn) return null;

  const sections: { id: DashboardSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('dashboard.overview'), icon: <DashboardIcon /> },
    ...(myTeams.length > 0 ? [{ id: 'teams' as const, label: t('dashboard.myTeams'), icon: <GroupsIcon /> }] : []),
    { id: 'tournaments', label: t('dashboard.myTournaments'), icon: <EmojiEventsIcon /> },
    ...(myTournaments.length > 0 ? [{ id: 'teamsByTournament' as const, label: t('dashboard.teamsByTournament'), icon: <GroupsIcon /> }] : []),
    { id: 'players', label: t('dashboard.playersSection'), icon: <PeopleIcon /> },
    { id: 'messages', label: t('dashboard.messages'), icon: <MailIcon /> },
    { id: 'createTournament', label: t('app.nav.createTournament'), icon: <AddCircleOutlineIcon /> },
    { id: 'createTeam', label: t('app.nav.createTeam'), icon: <GroupsIcon /> },
    { id: 'exploreSoccer', label: t('app.nav.soccer'), icon: <SportsSoccerIcon /> },
    { id: 'exploreFutsal', label: t('app.nav.futsal'), icon: <ExploreIcon /> },
    { id: 'profile', label: t('auth.profile.title'), icon: <PersonIcon /> },
  ];

  const sidebarContent = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        pt: 2,
        pb: 2,
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, mb: 1 }}>
        {t('dashboard.title')}
      </Typography>
      <List disablePadding>
        {sections.map(({ id, label, icon }) => (
          <ListItemButton
            key={id}
            selected={effectiveSection === id}
            onClick={() => {
              setSection(id);
              navigate(location.pathname, { state: { section: id }, replace: true });
              if (id !== 'teams') {
                setSelectedTeamId(null);
                setTeamViewTournamentSlugOrId(null);
              }
              if (id !== 'tournaments') {
                setSelectedTournamentSlugOrId(null);
                setShowCreateTeam(false);
                setCreateTeamTournamentSlugOrId(null);
                setSelectedTeamIdInTournament(null);
                setTeamViewFromTeamsByTournament(false);
              }
              if (id === 'tournaments') {
                if (teamViewTournamentSlugOrId) setSelectedTournamentSlugOrId(teamViewTournamentSlugOrId);
                setTeamViewTournamentSlugOrId(null);
                setSelectedTeamIdInTournament(null);
                setTeamViewFromTeamsByTournament(false);
              }
              if (id !== 'messages') setSelectedConversationId(null);
              if (id !== 'players') {
                setPlayersSectionTournamentId(null);
                setPlayersSectionTeamId(null);
                setPlayersTournamentTeams(null);
                setPlayersList([]);
                setPlayersTotal(0);
                setPlayersPage(1);
              }
              if (isMobile) setSidebarOpen(false);
            }}
            sx={{
              mx: 1,
              borderRadius: 2,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '& .MuiListItemIcon-root': { color: 'inherit' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: effectiveSection === id ? 'inherit' : 'primary.main' }}>
              {icon}
            </ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <AppBar title={t('dashboard.title')} />

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Desktop: persistent sidebar */}
          {!isMobile && sidebarContent}

          {/* Mobile: drawer sidebar */}
          {isMobile && (
            <Drawer
              variant="temporary"
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                '& .MuiDrawer-paper': {
                  width: SIDEBAR_WIDTH,
                  boxSizing: 'border-box',
                  top: 56,
                  height: 'calc(100% - 56px)',
                },
              }}
            >
              {sidebarContent}
            </Drawer>
          )}

          {/* Main content */}
          <Box
            component="main"
            sx={{
              flex: 1,
              overflow: 'auto',
              py: { xs: 2, md: 3 },
              px: { xs: 2, md: 3 },
              minWidth: 0,
            }}
          >
            {isMobile && (
              <IconButton
                onClick={() => setSidebarOpen(true)}
                sx={{ mb: 2 }}
                aria-label={t('app.menu')}
              >
                <MenuIcon />
              </IconButton>
            )}

            {effectiveSection === 'overview' && (
              <Box>
                <Typography variant="h4" color="primary.main" fontWeight={700} sx={{ mb: 1 }}>
                  {t('dashboard.welcome')}
                  {user?.name || user?.email ? `, ${user.name || user.email}` : ''}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {t('dashboard.myTeamsDesc')} {t('dashboard.myTournamentsDesc')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {myTeams.length > 0 && (
                    <Card
                      variant="outlined"
                      sx={{
                        minWidth: 200,
                        cursor: 'pointer',
                        borderColor: 'divider',
                        '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                      }}
                      onClick={() => setSection('teams')}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <GroupsIcon color="secondary" />
                          <Typography variant="h6">{t('dashboard.myTeams')}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {myTeams.length} {t('dashboard.myTeams').toLowerCase()}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                  <Card
                    variant="outlined"
                    sx={{
                      minWidth: 200,
                      cursor: 'pointer',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                    }}
                    onClick={() => setSection('tournaments')}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <EmojiEventsIcon color="primary" />
                        <Typography variant="h6">{t('dashboard.myTournaments')}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {myTournaments.length} {t('dashboard.myTournaments').toLowerCase()}
                      </Typography>
                    </CardContent>
                  </Card>
                  {!loadingTournaments && myTournaments.length === 0 && (
                    <Card
                      variant="outlined"
                      sx={{
                        minWidth: 200,
                        cursor: 'pointer',
                        borderColor: 'primary.main',
                        borderStyle: 'dashed',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark', borderColor: 'primary.dark' },
                      }}
                      onClick={() => setSection('createTournament')}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <AddCircleOutlineIcon />
                          <Typography variant="h6">{t('app.nav.createTournament')}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {t('dashboard.emptyTournaments')}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Box>
            )}

            {effectiveSection === 'teams' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <GroupsIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                  <Typography variant="h5" fontWeight={600}>
                    {t('dashboard.myTeams')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('dashboard.myTeamsDesc')}
                </Typography>
                {loadingTeams ? (
                  <Typography color="text.secondary">{t('app.myTeams.loading')}</Typography>
                ) : myTeams.length === 0 ? (
                  <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Typography color="text.secondary">{t('dashboard.emptyTeams')}</Typography>
                  </Card>
                ) : (
                  <Box>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                      {t('dashboard.selectTeam')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {myTeams.map((team) => (
                        <Card
                          key={team.id}
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            borderColor: 'divider',
                            '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                          }}
                          onClick={() => navigate(`/teams/${team.id}`)}
                        >
                          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {team.name}
                            </Typography>
                            {team.tournament?.name && (
                              <Typography variant="body2" color="text.secondary">
                                {team.tournament.name}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {effectiveSection === 'tournaments' && (
              <Box>
                {selectedTournamentSlugOrId ? (
                  selectedTeamIdInTournament ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Button
                          startIcon={<ArrowBackIcon />}
                          onClick={() => {
                            setSelectedTeamIdInTournament(null);
                            setTeamViewTournamentSlugOrId(null);
                            setTeamViewFromTeamsByTournament(false);
                            if (teamViewFromTeamsByTournament) {
                              setSection('teamsByTournament');
                              navigate(location.pathname, { state: { section: 'teamsByTournament' }, replace: true });
                            } else {
                              navigate(location.pathname, { state: { section: 'tournaments', selectedTournamentSlugOrId }, replace: true });
                            }
                          }}
                          sx={{ textTransform: 'none', mr: 1 }}
                        >
                          {teamViewFromTeamsByTournament ? t('dashboard.backToTeamsByTournament') : t('dashboard.backToTournament')}
                        </Button>
                      </Box>
                      <TeamDetailPage
                        key={selectedTeamIdInTournament}
                        embedded
                        teamId={selectedTeamIdInTournament}
                        onClose={() => {
                          setSelectedTeamIdInTournament(null);
                          setTeamViewTournamentSlugOrId(null);
                          setTeamViewFromTeamsByTournament(false);
                          if (teamViewFromTeamsByTournament) {
                            setSection('teamsByTournament');
                            navigate(location.pathname, { state: { section: 'teamsByTournament' }, replace: true });
                          } else {
                            navigate(location.pathname, { state: { section: 'tournaments', selectedTournamentSlugOrId }, replace: true });
                          }
                        }}
                      />
                    </>
                  ) : showCreateTeam ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Button
                          startIcon={<ArrowBackIcon />}
                          onClick={() => setShowCreateTeam(false)}
                          sx={{ textTransform: 'none', mr: 1 }}
                        >
                          {t('tournament.create.back')}
                        </Button>
                      </Box>
                      <CreateTeamPage
                        embedded
                        initialTournamentSlugOrId={createTeamTournamentSlugOrId}
                        onClose={() => setShowCreateTeam(false)}
                      />
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Button
                          startIcon={<ArrowBackIcon />}
                          onClick={() => setSelectedTournamentSlugOrId(null)}
                          sx={{ textTransform: 'none', mr: 1 }}
                        >
                          {t('dashboard.backToTournamentList')}
                        </Button>
                      </Box>
                      <TournamentDetailPage
                        embedded
                        slugOrId={selectedTournamentSlugOrId}
                        onOpenCreateTeam={(slugOrId) => {
                          setCreateTeamTournamentSlugOrId(slugOrId);
                          setShowCreateTeam(true);
                        }}
                      />
                    </>
                  )
                ) : (
                  <MyTournamentsPage
                    embedded
                    onNavigateToSection={(s) => setSection(s as DashboardSection)}
                    onSelectTournament={(slugOrId) => {
                      setSelectedTournamentSlugOrId(slugOrId);
                      setSelectedTeamIdInTournament(null);
                      setTeamViewTournamentSlugOrId(null);
                    }}
                  />
                )}
              </Box>
            )}

            {effectiveSection === 'teamsByTournament' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <GroupsIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                  <Typography variant="h5" fontWeight={600}>
                    {t('dashboard.teamsByTournament')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('dashboard.teamsByTournamentDesc')}
                </Typography>
                {loadingTournamentsWithTeams ? (
                  <Typography color="text.secondary">{t('app.myTournaments.loading')}</Typography>
                ) : myTournaments.length === 0 ? (
                  <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Typography color="text.secondary">{t('dashboard.emptyTournaments')}</Typography>
                  </Card>
                ) : (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <TextField
                        size="small"
                        placeholder={t('dashboard.teamsByTournamentSearchPlaceholder')}
                        value={teamsByTournamentSearch}
                        onChange={(e) => setTeamsByTournamentSearch(e.target.value)}
                        sx={{ minWidth: 220 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id="teams-by-tournament-filter-sport">
                          {t('dashboard.filterBySport')}
                        </InputLabel>
                        <Select
                          labelId="teams-by-tournament-filter-sport"
                          value={teamsByTournamentFilterSport}
                          label={t('dashboard.filterBySport')}
                          onChange={(e) => setTeamsByTournamentFilterSport(e.target.value)}
                        >
                          <MenuItem value="">{t('dashboard.filterAll')}</MenuItem>
                          <MenuItem value="soccer">
                            {t('tournament.create.sport.options.soccer')}
                          </MenuItem>
                          <MenuItem value="futsal">
                            {t('tournament.create.sport.options.futsal')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    {filteredTeamsByTournament.length === 0 ? (
                      <Typography color="text.secondary">
                        {t('dashboard.noTeamsMatchFilters')}
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {filteredTeamsByTournament.map(({ tournament, key, data, teams }) => (
                          <Card key={tournament.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            <Box sx={{ bgcolor: 'action.hover', px: 2, py: 1.5 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {data?.name ?? tournament.name}
                              </Typography>
                            </Box>
                            <List disablePadding>
                              {teams.length === 0 ? (
                                <ListItemButton disabled>
                                  <ListItemText primary={t('dashboard.noTeamsInTournament')} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
                                </ListItemButton>
                              ) : (
                                teams.map((team) => (
                                <ListItemButton
                                  key={team.id}
                                  onClick={() =>
                                    navigate('/dashboard', {
                                      state: {
                                        section: 'tournaments',
                                        selectedTournamentSlugOrId: key,
                                        selectedTeamIdInTournament: team.id,
                                        selectedTeamName: team.name,
                                        fromTeamsByTournament: true,
                                      },
                                    })
                                  }
                                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                  <Avatar
                                    src={team.logoUrl ?? undefined}
                                    sx={{ width: 28, height: 28, mr: 1.5, bgcolor: 'action.hover' }}
                                  >
                                    <GroupsIcon sx={{ fontSize: 18 }} />
                                  </Avatar>
                                  <ListItemText primary={team.name} primaryTypographyProps={{ fontWeight: 500 }} />
                                </ListItemButton>
                                ))
                              )}
                            </List>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}

            {effectiveSection === 'players' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PeopleIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                  <Typography variant="h5" fontWeight={600}>
                    {t('dashboard.playersSection')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('dashboard.playersSectionDesc')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>{t('dashboard.playersFilterByTournament')}</InputLabel>
                    <Select
                      value={playersSectionTournamentId ?? ''}
                      label={t('dashboard.playersFilterByTournament')}
                      onChange={(e) => {
                        setPlayersSectionTournamentId(e.target.value || null);
                        setPlayersPage(1);
                      }}
                    >
                      <MenuItem value="">
                        <em>{t('dashboard.playersSelectTournament')}</em>
                      </MenuItem>
                      {playersSectionTournaments.map((tr) => (
                        <MenuItem key={tr.id} value={tr.id}>
                          {tr.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 220 }} disabled={!playersSectionTournamentId}>
                    <InputLabel>{t('dashboard.playersFilterByTeam')}</InputLabel>
                    <Select
                      value={playersSectionTeamId ?? ''}
                      label={t('dashboard.playersFilterByTeam')}
                      onChange={(e) => {
                        setPlayersSectionTeamId(e.target.value || null);
                        setPlayersPage(1);
                      }}
                    >
                      <MenuItem value="">
                        <em>{t('dashboard.playersAllTeams')}</em>
                      </MenuItem>
                      {(playersTournamentTeams ?? []).map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {playersSectionTeamId && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => {
                        const teamId = playersSectionTeamId;
                        if (teamId) {
                          getTeam(teamId)
                            .then((team) => {
                              setTeamForRoster(team);
                              setRosterPdfOpen(true);
                            })
                            .catch(() => setTeamForRoster(null));
                        }
                      }}
                    >
                      {t('team.detail.rosterPdf.previewInNewTab')}
                    </Button>
                  )}
                </Box>
                {loadingPlayers ? (
                  <Typography color="text.secondary">{t('dashboard.playersLoading')}</Typography>
                ) : !playersSectionTournamentId ? (
                  <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Typography color="text.secondary">{t('dashboard.playersSelectTournamentFirst')}</Typography>
                  </Card>
                ) : playersList.length === 0 ? (
                  <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Typography color="text.secondary">{t('dashboard.playersEmpty')}</Typography>
                  </Card>
                ) : (
                  <>
                    <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.playersPhoto')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.playersName')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.playersBirthDate')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('team.detail.age')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.playersAgeCategory')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.playersTeam')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {playersList.map((row) => {
                            const age = getAgeFromBirthDate(row.birthDate, row.birthYear);
                            return (
                              <TableRow key={row.id} hover>
                                <TableCell>
                                  <Avatar
                                    src={row.photoUrl ?? DEFAULT_PERSON_IMAGE_URL}
                                    sx={{ width: 40, height: 40, bgcolor: 'action.hover' }}
                                  >
                                    <PersonIcon sx={{ fontSize: 24 }} />
                                  </Avatar>
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    component={Button}
                                    variant="body2"
                                    sx={{ textTransform: 'none', p: 0, minWidth: 0, fontWeight: 600, textAlign: 'left' }}
                                    onClick={() =>
                                      navigate(`/teams/${row.teamId}/players/${row.id}`, {
                                        state: {
                                          from: 'playersSection' as const,
                                          playersSectionTournamentId: playersSectionTournamentId ?? undefined,
                                          playersSectionTeamId: playersSectionTeamId ?? undefined,
                                        },
                                      })
                                    }
                                  >
                                    {row.name}
                                  </Typography>
                                </TableCell>
                                <TableCell>{formatPlayerBirthDisplay(row.birthDate, row.birthYear)}</TableCell>
                                <TableCell>{age != null ? t('team.detail.yearsOld', { count: age }) : '—'}</TableCell>
                                <TableCell>{row.ageCategoryName ?? '—'}</TableCell>
                                <TableCell>{row.teamName}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      component="div"
                      count={playersTotal}
                      page={playersPage - 1}
                      onPageChange={(_, newPage) => setPlayersPage(newPage + 1)}
                      rowsPerPage={PLAYERS_PAGE_SIZE}
                      rowsPerPageOptions={[PLAYERS_PAGE_SIZE]}
                      labelDisplayedRows={({ from, to, count }) =>
                        `${from}–${to} ${t('dashboard.playersPaginationOf')} ${count}`}
                    />
                  </>
                )}
              </Box>
            )}

            {teamForRoster && (
              <TeamRosterPdfDialog
                open={rosterPdfOpen}
                onClose={() => {
                  setRosterPdfOpen(false);
                  setTeamForRoster(null);
                }}
                team={teamForRoster}
                categoryName={(() => {
                  if (!teamForRoster.tournament?.ageCategories?.length) return null;
                  const categories = teamForRoster.tournament.ageCategories;
                  if (categories.length === 1) return categories[0].name;
                  const primaryId = teamForRoster.tournamentId;
                  const players = teamForRoster.players ?? [];
                  if (!primaryId || !players.length) return categories[0].name;
                  const counts: Record<string, number> = {};
                  for (const p of players) {
                    const catId = p.tournamentAgeCategoryId ?? (p as { categoryByTournament?: Record<string, { categoryId?: string }> }).categoryByTournament?.[primaryId]?.categoryId;
                    const name = catId ? categories.find((c) => c.id === catId)?.name : null;
                    if (name) counts[name] = (counts[name] ?? 0) + 1;
                  }
                  const entries = Object.entries(counts);
                  if (entries.length === 0) return categories[0].name;
                  return entries.sort((a, b) => b[1] - a[1])[0][0];
                })()}
                ageCategories={teamForRoster.tournament?.ageCategories ?? undefined}
              />
            )}

            {effectiveSection === 'messages' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <MailIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                  <Typography variant="h5" fontWeight={600}>
                    {t('messages.title')}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setNewConversationOpen(true);
                      setLoadingRelatedUsers(true);
                      listRelatedUsers()
                        .then((res) => setRelatedUsers(res.users))
                        .catch(() => setRelatedUsers([]))
                        .finally(() => setLoadingRelatedUsers(false));
                    }}
                    sx={{ textTransform: 'none', ml: 1 }}
                  >
                    {t('messages.newConversation')}
                  </Button>
                  {myTournaments.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setBroadcastOpen(true);
                        setBroadcastTournamentId(myTournaments[0]?.id ?? '');
                        setBroadcastBody('');
                        setBroadcastAllTeams(true);
                        setBroadcastTeamIds([]);
                        setBroadcastSentCount(null);
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      {t('messages.messageToTeams')}
                    </Button>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('messages.copyToEmail')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', fontStyle: 'italic' }}>
                  {t('messages.retentionLegend')}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    {t('messages.sentToTeamsHistory')}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 220, mb: 1 }}>
                    <InputLabel>{t('messages.selectTournamentForHistory')}</InputLabel>
                    <Select
                      value={broadcastHistoryTournamentId}
                      label={t('messages.selectTournamentForHistory')}
                      onChange={(e) => setBroadcastHistoryTournamentId(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>{t('messages.noTournamentSelected')}</em>
                      </MenuItem>
                      {myTournaments.map((tr) => (
                        <MenuItem key={tr.id} value={tr.id}>
                          {tr.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {broadcastHistoryTournamentId && (
                    loadingBroadcastHistory ? (
                      <Typography variant="body2" color="text.secondary">{t('app.myTeams.loading')}</Typography>
                    ) : broadcastHistory.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">{t('messages.noBroadcastsYet')}</Typography>
                    ) : (
                      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {broadcastHistory.map((b) => (
                          <Card key={b.id} variant="outlined" sx={{ borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                              <Typography variant="body2" sx={{ flex: 1 }}>{b.body}</Typography>
                              {b.senderId === user?.id && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  title={t('messages.deleteBroadcast')}
                                  onClick={() => broadcastHistoryTournamentId && setBroadcastToDelete({ tournamentId: broadcastHistoryTournamentId, broadcastId: b.id })}
                                  aria-label={t('messages.deleteBroadcast')}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(b.createdAt).toLocaleString()} · {t('messages.sentToCount', { count: b.sentCount })}
                            </Typography>
                          </Card>
                        ))}
                      </List>
                    )
                  )}
                </Box>
                {loadingConversations ? (
                  <Typography color="text.secondary">{t('app.myTeams.loading')}</Typography>
                ) : !selectedConversationId ? (
                  conversations.length === 0 ? (
                    <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                      <Typography color="text.secondary">{t('messages.empty')}</Typography>
                    </Card>
                  ) : (
                    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {conversations.map((c) => (
                        <Card
                          key={c.id}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            cursor: 'pointer',
                            '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                          }}
                        >
                          <ListItemButton
                            onClick={() => setSelectedConversationId(c.id)}
                            sx={{ py: 1.5 }}
                          >
                            <ListItemText
                              primary={c.otherUser?.name ?? c.otherUser?.email ?? t('messages.title')}
                              secondary={c.lastMessage?.body}
                              primaryTypographyProps={{ fontWeight: 600 }}
                              secondaryTypographyProps={{ noWrap: true }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              title={t('messages.deleteConversation')}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConversationIdToDelete(c.id);
                                setDeleteConversationDialogOpen(true);
                              }}
                              aria-label={t('messages.deleteConversation')}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </ListItemButton>
                        </Card>
                      ))}
                    </List>
                  )
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={() => setSelectedConversationId(null)}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none', mb: 1 }}
                    >
                      {t('tournament.create.back')}
                    </Button>
                    <Card variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 320, borderRadius: 2 }}>
                      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {t('messages.conversationWith', {
                            name:
                              conversations.find((c) => c.id === selectedConversationId)?.otherUser?.name ??
                              conversations.find((c) => c.id === selectedConversationId)?.otherUser?.email ??
                              '',
                          })}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          title={t('messages.deleteConversation')}
                          onClick={() => {
                            setConversationIdToDelete(null);
                            setDeleteConversationDialogOpen(true);
                          }}
                          aria-label={t('messages.deleteConversation')}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {loadingMessages ? (
                          <Typography color="text.secondary">{t('app.myTeams.loading')}</Typography>
                        ) : (
                          messages.map((m) => {
                            const isSentByMe = m.senderId === user?.id;
                            const senderLabel = isSentByMe
                              ? t('messages.sentByYou')
                              : t('messages.from', {
                                  name: m.sender?.name ?? m.sender?.email ?? t('messages.otherUser'),
                                });
                            return (
                              <Box
                                key={m.id}
                                sx={{
                                  alignSelf: isSentByMe ? 'flex-end' : 'flex-start',
                                  maxWidth: '85%',
                                  bgcolor: isSentByMe ? 'primary.main' : 'action.hover',
                                  color: isSentByMe ? 'primary.contrastText' : 'text.primary',
                                  px: 2,
                                  py: 1,
                                  borderRadius: 2,
                                }}
                              >
                                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                                  {senderLabel}
                                </Typography>
                                <Typography variant="body2">{m.body}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                                  {new Date(m.createdAt).toLocaleString()}
                                </Typography>
                              </Box>
                            );
                          })
                        )}
                      </Box>
                      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={t('messages.placeholder')}
                          value={messageDraft}
                          onChange={(e) => setMessageDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (messageDraft.trim() && selectedConversationId && !sendingMessage) {
                                setSendingMessage(true);
                                sendMessage(selectedConversationId, messageDraft.trim())
                                  .then((sent) => {
                                    setMessages((prev) => [...prev, sent]);
                                    setMessageDraft('');
                                  })
                                  .finally(() => setSendingMessage(false));
                              }
                            }
                          }}
                        />
                        <Button
                          variant="contained"
                          disabled={!messageDraft.trim() || sendingMessage}
                          onClick={() => {
                            if (!messageDraft.trim() || !selectedConversationId || sendingMessage) return;
                            setSendingMessage(true);
                            sendMessage(selectedConversationId, messageDraft.trim())
                              .then((sent) => {
                                setMessages((prev) => [...prev, sent]);
                                setMessageDraft('');
                              })
                              .finally(() => setSendingMessage(false));
                          }}
                          startIcon={<SendIcon />}
                          sx={{ textTransform: 'none', flexShrink: 0 }}
                        >
                          {t('messages.send')}
                        </Button>
                      </Box>
                    </Card>
                  </Box>
                )}

                <Dialog open={newConversationOpen} onClose={() => setNewConversationOpen(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>{t('messages.newConversation')}</DialogTitle>
                  <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('messages.selectUser')}
                    </Typography>
                    {loadingRelatedUsers ? (
                      <Typography color="text.secondary">{t('messages.loadingUsers')}</Typography>
                    ) : relatedUsers.length === 0 ? (
                      <Typography color="text.secondary">{t('messages.empty')}</Typography>
                    ) : (
                      <List disablePadding>
                        {relatedUsers.map((u) => (
                          <ListItemButton
                            key={u.id}
                            onClick={() => {
                              createOrGetConversation(u.id)
                                .then((res) => {
                                  setConversations((prev) => {
                                    const exists = prev.some((c) => c.id === res.conversation.id);
                                    if (exists) return prev;
                                    return [
                                      {
                                        id: res.conversation.id,
                                        otherUser: res.otherUser,
                                        lastMessage: null,
                                        updatedAt: res.conversation.updatedAt,
                                      },
                                      ...prev,
                                    ];
                                  });
                                  setSelectedConversationId(res.conversation.id);
                                  setNewConversationOpen(false);
                                })
                                .catch(() => {});
                            }}
                          >
                            <ListItemText primary={u.name ?? u.email} secondary={u.name ? u.email : undefined} />
                          </ListItemButton>
                        ))}
                      </List>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={deleteConversationDialogOpen}
                  onClose={() => {
                    if (!deletingConversation) {
                      setDeleteConversationDialogOpen(false);
                      setConversationIdToDelete(null);
                    }
                  }}
                  maxWidth="xs"
                  fullWidth
                >
                  <DialogTitle>{t('messages.deleteConversation')}</DialogTitle>
                  <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                      {t('messages.deleteConversationConfirm')}
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button
                      onClick={() => {
                        setDeleteConversationDialogOpen(false);
                        setConversationIdToDelete(null);
                      }}
                      disabled={deletingConversation}
                    >
                      {t('tournament.create.cancel')}
                    </Button>
                    <Button
                      color="error"
                      variant="contained"
                      disabled={!(conversationIdToDelete ?? selectedConversationId) || deletingConversation}
                      onClick={() => {
                        const idToDelete = conversationIdToDelete ?? selectedConversationId;
                        if (!idToDelete) return;
                        setDeletingConversation(true);
                        deleteConversation(idToDelete)
                          .then(() => {
                            setConversations((prev) => prev.filter((c) => c.id !== idToDelete));
                            if (selectedConversationId === idToDelete) {
                              setSelectedConversationId(null);
                              setMessages([]);
                            }
                            setDeleteConversationDialogOpen(false);
                            setConversationIdToDelete(null);
                          })
                          .finally(() => setDeletingConversation(false));
                      }}
                    >
                      {deletingConversation ? t('app.myTeams.loading') : t('messages.deleteConversation')}
                    </Button>
                  </DialogActions>
                </Dialog>

                <Dialog
                  open={!!broadcastToDelete}
                  onClose={() => !deletingBroadcast && setBroadcastToDelete(null)}
                  maxWidth="xs"
                  fullWidth
                >
                  <DialogTitle>{t('messages.deleteBroadcast')}</DialogTitle>
                  <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                      {t('messages.deleteBroadcastConfirm')}
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setBroadcastToDelete(null)} disabled={deletingBroadcast}>
                      {t('tournament.create.cancel')}
                    </Button>
                    <Button
                      color="error"
                      variant="contained"
                      disabled={!broadcastToDelete || deletingBroadcast}
                      onClick={() => {
                        if (!broadcastToDelete) return;
                        setDeletingBroadcast(true);
                        deleteTournamentBroadcast(broadcastToDelete.tournamentId, broadcastToDelete.broadcastId)
                          .then(() => {
                            setBroadcastHistory((prev) => prev.filter((x) => x.id !== broadcastToDelete.broadcastId));
                            setBroadcastToDelete(null);
                          })
                          .finally(() => setDeletingBroadcast(false));
                      }}
                    >
                      {deletingBroadcast ? t('app.myTeams.loading') : t('messages.deleteBroadcast')}
                    </Button>
                  </DialogActions>
                </Dialog>

                <Dialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>{t('messages.messageToTeams')}</DialogTitle>
                  <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      select
                      fullWidth
                      label={t('messages.selectTournament')}
                      value={broadcastTournamentId}
                      onChange={(e) => setBroadcastTournamentId(e.target.value)}
                      size="small"
                    >
                      {myTournaments.map((tr) => (
                        <MenuItem key={tr.id} value={tr.id}>
                          {tr.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    {broadcastTeamsList.length > 0 && (
                      <>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={broadcastAllTeams}
                              onChange={(e) => {
                                setBroadcastAllTeams(e.target.checked);
                                if (e.target.checked) setBroadcastTeamIds([]);
                              }}
                            />
                          }
                          label={t('messages.allTeams')}
                        />
                        {!broadcastAllTeams && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              {t('messages.selectTeams')}
                            </Typography>
                            {broadcastTeamsList.map((team) => (
                              <FormControlLabel
                                key={team.teamId}
                                control={
                                  <Checkbox
                                    checked={broadcastTeamIds.includes(team.teamId)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setBroadcastTeamIds((prev) => [...prev, team.teamId]);
                                      } else {
                                        setBroadcastTeamIds((prev) => prev.filter((id) => id !== team.teamId));
                                      }
                                    }}
                                  />
                                }
                                label={team.teamName}
                              />
                            ))}
                          </Box>
                        )}
                      </>
                    )}
                    <TextField
                      multiline
                      rows={4}
                      fullWidth
                      label={t('messages.broadcastPlaceholder')}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder={t('messages.placeholder')}
                    />
                    {broadcastSentCount !== null && (
                      <Typography color="primary.main">{t('messages.broadcastSuccess', { count: broadcastSentCount })}</Typography>
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setBroadcastOpen(false)}>{t('tournament.create.cancel')}</Button>
                    <Button
                      variant="contained"
                      disabled={!broadcastBody.trim() || broadcastSending}
                      onClick={() => {
                        if (!broadcastBody.trim() || !broadcastTournamentId) return;
                        setBroadcastSending(true);
                        setBroadcastSentCount(null);
                        broadcastMessageToTeams(broadcastTournamentId, {
                          body: broadcastBody.trim(),
                          teamIds: broadcastAllTeams ? undefined : broadcastTeamIds.length > 0 ? broadcastTeamIds : undefined,
                        })
                          .then((res) => {
                            setBroadcastSentCount(res.sent);
                            setBroadcastBody('');
                            if (broadcastHistoryTournamentId === broadcastTournamentId) {
                              listTournamentBroadcasts(broadcastTournamentId)
                                .then((r) => setBroadcastHistory(r.broadcasts))
                                .catch(() => {});
                            }
                          })
                          .finally(() => setBroadcastSending(false));
                      }}
                    >
                      {broadcastSending ? t('app.myTeams.loading') : t('messages.sendBroadcast')}
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            )}

            {effectiveSection === 'createTournament' && (
              <CreateTournamentPage
                embedded
                onClose={() => setSection('overview')}
              />
            )}
            {effectiveSection === 'createTeam' && (
              <CreateTeamPage
                embedded
                initialTournamentSlugOrId={createTeamTournamentSlugOrId}
                onClose={() => setSection('overview')}
              />
            )}
            {effectiveSection === 'exploreSoccer' && (
              <TournamentsBySportPage
                embedded
                sport="soccer"
                onClose={() => setSection('overview')}
              />
            )}
            {effectiveSection === 'exploreFutsal' && (
              <TournamentsBySportPage
                embedded
                sport="futsal"
                onClose={() => setSection('overview')}
              />
            )}
            {effectiveSection === 'profile' && (
              <ProfilePage embedded onClose={() => setSection('overview')} />
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
