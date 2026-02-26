import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Popover,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { appTheme, heroGradient } from '@shared/theme';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PublicIcon from '@mui/icons-material/Public';
import PaletteIcon from '@mui/icons-material/Palette';
import SearchIcon from '@mui/icons-material/Search';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import BlockIcon from '@mui/icons-material/Block';
import InfoIcon from '@mui/icons-material/Info';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import PeopleIcon from '@mui/icons-material/People';
import UndoIcon from '@mui/icons-material/Undo';
import WarningIcon from '@mui/icons-material/Warning';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import {
  createMatch,
  deleteMatch,
  deleteMatches,
  generateSchedule,
  listMatches,
  updateMatch,
} from '@shared/api/matches';
import type { Match, MatchEvent, MatchPenalty } from '@shared/api/matches';
import { getStatisticsForSport } from '@shared/constants/matchStatistics';
import { getCurrencyForLocale } from '@shared/utils/currency';
import { formatBirthDateMMDDYYYY, formatPlayerBirthDisplay, getAgeFromBirthDate, toLocalDateString, toLocalDateTimeString } from '@shared/utils/dateUtils';
import {
  addExistingTeam,
  approvePlayerChangeRequest,
  createTeam,
  getPlayerChangeRequest,
  getTeam,
  listAvailableTeams,
  listPlayerChangeRequests,
  listTeamVenues,
  rejectPlayerChangeRequest,
} from '@shared/api/teams';
import type { AvailableTeam, Player, PlayerChangeRequestItem, TeamVenue } from '@shared/api/teams';
import {
  deleteTournament,
  getStandings,
  getTournament,
  getTournamentPlayers,
  renewTournament,
  suspendTournament,
  updateTournament,
  updateTournamentStandingsOrder,
} from '@shared/api/tournaments';
import type { RootState } from '@shared/store';
import type { StandingRow, StandingsByGroup, Tournament, TournamentPlayerRow } from '@shared/api/tournaments';
import { DEFAULT_PERSON_IMAGE_URL } from '@shared/constants/defaultPersonImage';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { CustomizeColorsDialog } from './CustomizeColorsDialog';
import { GenerateReportDialog } from './GenerateReportDialog';
import { PublicTournamentView } from './PublicTournamentView';
import logoUrl from '../../../assets/ligamatch-logo.png';

const defaultTeamLogoUrl = logoUrl;

const theme = appTheme;

const SPORTS = [
  { value: 'soccer', labelKey: 'soccer' },
  { value: 'futsal', labelKey: 'futsal' },
] as const;

const ProBadge = () => (
  <Chip
    label="PRO"
    size="small"
    sx={{
      ml: 1,
      fontWeight: 700,
      bgcolor: heroGradient,
      background: heroGradient,
      color: 'white',
      fontSize: '0.7rem',
    }}
  />
);

function SortableStandingsRow({
  row,
  index,
  isAdmin,
  canReorder,
  onTeamClick,
  tournamentIsPro,
  defaultTeamLogoUrl,
  showGroupColumn = true,
}: {
  row: StandingRow;
  index: number;
  isAdmin: boolean;
  canReorder: boolean;
  onTeamClick: (teamId: string) => void;
  tournamentIsPro: boolean;
  defaultTeamLogoUrl: string;
  showGroupColumn?: boolean;
}) {
  const teamLogoUrl = tournamentIsPro && row.teamLogoUrl ? row.teamLogoUrl : defaultTeamLogoUrl;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.teamId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} sx={{ bgcolor: isDragging ? 'action.hover' : undefined }}>
      {canReorder && (
        <TableCell sx={{ width: 36, py: 0.5, cursor: 'grab' }} {...attributes} {...listeners}>
          <DragIndicatorIcon fontSize="small" color="action" />
        </TableCell>
      )}
      <TableCell sx={{ width: 40, fontWeight: 600 }} align="center">{index + 1}</TableCell>
      {showGroupColumn && row.groupName && (
        <TableCell sx={{ color: 'text.secondary' }}>{row.groupName}</TableCell>
      )}
      <TableCell sx={{ fontWeight: 600 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {tournamentIsPro && (
            <Box
              component="img"
              src={teamLogoUrl}
              alt=""
              sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }}
            />
          )}
          {isAdmin ? (
            <Button
              variant="text"
              size="small"
              sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
              onClick={() => onTeamClick(row.teamId)}
            >
              {row.teamName}
            </Button>
          ) : (
            <span>{row.teamName}</span>
          )}
        </Box>
      </TableCell>
      <TableCell align="center">{row.played}</TableCell>
      <TableCell align="center">{row.won}</TableCell>
      <TableCell align="center">{row.drawn}</TableCell>
      <TableCell align="center">{row.lost}</TableCell>
      <TableCell align="center">{row.goalsFor}</TableCell>
      <TableCell align="center">{row.goalsAgainst}</TableCell>
      <TableCell align="center" sx={{ fontWeight: row.goalDiff !== 0 ? 600 : 400 }}>
        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
      </TableCell>
      <TableCell align="center" sx={{ fontWeight: 700 }}>
        {row.points}
      </TableCell>
    </TableRow>
  );
}

export type TournamentDetailPageProps = {
  /** When true, render without AppBar for embedding inside Dashboard */
  embedded?: boolean;
  /** When provided (e.g. from Dashboard), use this instead of route param */
  slugOrId?: string;
  /** When provided and embedded, "Create team" opens in dashboard instead of navigating */
  onOpenCreateTeam?: (tournamentSlugOrId: string) => void;
};

export const TournamentDetailPage = (props: TournamentDetailPageProps = {}) => {
  const { embedded = false, slugOrId: slugOrIdProp, onOpenCreateTeam } = props;
  const { t, i18n } = useTranslation();
  const userCurrency = getCurrencyForLocale(i18n.language);
  const navigate = useNavigate();
  const { slugOrId: slugOrIdParam } = useParams<{ slugOrId: string }>();
  const slugOrId = slugOrIdProp ?? slugOrIdParam ?? '';
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userPlan = useSelector((state: RootState) => state.auth.user?.plan || 'free');
  const isPro = userPlan === 'pro' || userPlan === 'fullPro';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [addTeamMode, setAddTeamMode] = useState<'create' | 'existing'>('create');
  const [addTeamName, setAddTeamName] = useState('');
  const [addTeamDesc, setAddTeamDesc] = useState('');
  const [addTeamEmail, setAddTeamEmail] = useState('');
  const [addTeamSubmitting, setAddTeamSubmitting] = useState(false);
  const [addTeamError, setAddTeamError] = useState('');
  const [availableTeams, setAvailableTeams] = useState<AvailableTeam[]>([]);
  const [availableTeamsLoading, setAvailableTeamsLoading] = useState(false);
  const [selectedExistingTeamId, setSelectedExistingTeamId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateRounds, setGenerateRounds] = useState<1 | 2>(1);
  const [generateMode, setGenerateMode] = useState<'all' | 'groups'>('all');
  const [generateNumGroups, setGenerateNumGroups] = useState(2);
  const [generateSubmitting, setGenerateSubmitting] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [editMatchOpen, setEditMatchOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [addMatchOpen, setAddMatchOpen] = useState(false);
  const [addMatchForm, setAddMatchForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    reason: 'administrative' as 'rescheduled' | 'administrative',
    suspendedMatchId: '',
    scheduledAt: '',
  });
  const [addMatchSubmitting, setAddMatchSubmitting] = useState(false);
  const [addMatchError, setAddMatchError] = useState('');
  const [editResultOpen, setEditResultOpen] = useState(false);
  const [editResultMatch, setEditResultMatch] = useState<Match | null>(null);
  const [editResultHome, setEditResultHome] = useState<string>('');
  const [editResultAway, setEditResultAway] = useState<string>('');
  const [editResultStats, setEditResultStats] = useState<Record<string, { home: string; away: string }>>({});
  const [editResultMatchEvents, setEditResultMatchEvents] = useState<MatchEvent[]>([]);
  const [editResultExtraPoints, setEditResultExtraPoints] = useState<{ home: string; away: string }>({ home: '', away: '' });
  const [editResultPenalties, setEditResultPenalties] = useState<MatchPenalty[]>([]);
  const [editResultHomePlayers, setEditResultHomePlayers] = useState<Player[]>([]);
  const [editResultAwayPlayers, setEditResultAwayPlayers] = useState<Player[]>([]);
  const [editResultSubmitting, setEditResultSubmitting] = useState(false);
  const [editResultValidationError, setEditResultValidationError] = useState('');
  const [matchStatsPopover, setMatchStatsPopover] = useState<{ anchor: HTMLElement; match: Match } | null>(null);
  const [confirmSuspendMatchOpen, setConfirmSuspendMatchOpen] = useState(false);
  const [suspendMatchTarget, setSuspendMatchTarget] = useState<Match | null>(null);
  const [suspendMatchSubmitting, setSuspendMatchSubmitting] = useState(false);
  const [confirmRevertSuspendOpen, setConfirmRevertSuspendOpen] = useState(false);
  const [revertSuspendTarget, setRevertSuspendTarget] = useState<Match | null>(null);
  const [revertSuspendSubmitting, setRevertSuspendSubmitting] = useState(false);
  const [confirmDeleteMatchOpen, setConfirmDeleteMatchOpen] = useState(false);
  const [deleteMatchTarget, setDeleteMatchTarget] = useState<Match | null>(null);
  const [deleteMatchSubmitting, setDeleteMatchSubmitting] = useState(false);
  const [homeTeamVenues, setHomeTeamVenues] = useState<Record<string, TeamVenue[]>>({});
  const [playerChangeRequests, setPlayerChangeRequests] = useState<PlayerChangeRequestItem[]>([]);
  const [loadingPlayerRequests, setLoadingPlayerRequests] = useState(false);
  const [playerRequestActionId, setPlayerRequestActionId] = useState<string | null>(null);
  const [viewChangesRequestId, setViewChangesRequestId] = useState<string | null>(null);
  const [viewChangesRequestDetail, setViewChangesRequestDetail] = useState<PlayerChangeRequestItem | null>(null);
  const [editTournamentOpen, setEditTournamentOpen] = useState(false);
  type EditAgeCategory = { id: string; name: string; minBirthYear: number; maxBirthYear: number };
  const [editTournamentForm, setEditTournamentForm] = useState<{
    name: string;
    sport: string;
    categoryType: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string;
    tournamentType: string;
    isSingleVenue: boolean;
    venueName: string;
    ageCategories: EditAgeCategory[];
  }>({
    name: '',
    sport: '',
    categoryType: 'none',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    tournamentType: 'open',
    isSingleVenue: false,
    venueName: '',
    ageCategories: [{ id: 'cat-1', name: '', minBirthYear: new Date().getFullYear() - 50, maxBirthYear: new Date().getFullYear() }],
  });
  const [editTournamentSubmitting, setEditTournamentSubmitting] = useState(false);
  const [editTournamentError, setEditTournamentError] = useState('');
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [confirmRenewOpen, setConfirmRenewOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [colorsDialogOpen, setColorsDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [matchesFilter, setMatchesFilter] = useState('');
  const [matchesSortBy, setMatchesSortBy] = useState<'group' | 'home' | 'away' | 'scheduledAt'>('scheduledAt');
  const [matchesSortOrder, setMatchesSortOrder] = useState<'asc' | 'desc'>('asc');
  const [matchesPage, setMatchesPage] = useState(0);
  const [matchesRowsPerPage, setMatchesRowsPerPage] = useState(10);
  const [playerRequestsSortBy, setPlayerRequestsSortBy] = useState<'requestDate' | 'team' | 'requestType' | 'requestedBy'>('requestDate');
  const [playerRequestsSortOrder, setPlayerRequestsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [teamsSortOrder, setTeamsSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tournamentPlayersSortBy, setTournamentPlayersSortBy] = useState<'name' | 'birthDate' | 'team'>('name');
  const [tournamentPlayersSortOrder, setTournamentPlayersSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tournamentPlayersAgeCategoryFilter, setTournamentPlayersAgeCategoryFilter] = useState<string | null>(null);
  const [standingsSortBy, setStandingsSortBy] = useState<'team' | 'points' | 'played' | 'goalDiff'>('points');
  const [standingsSortOrder, setStandingsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [topScorersSortBy, setTopScorersSortBy] = useState<'player' | 'team' | 'goals'>('goals');
  const [topScorersSortOrder, setTopScorersSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cardsByMatchSortBy, setCardsByMatchSortBy] = useState<'date' | 'match' | 'player' | 'minute'>('date');
  const [cardsByMatchSortOrder, setCardsByMatchSortOrder] = useState<'asc' | 'desc'>('asc');
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsByGroup, setStandingsByGroup] = useState<StandingsByGroup[]>([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const TOURNAMENT_PLAYERS_PAGE_SIZE = 10;
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayerRow[]>([]);
  const [tournamentPlayersTotal, setTournamentPlayersTotal] = useState(0);
  const [tournamentPlayersPage, setTournamentPlayersPage] = useState(1);
  const [loadingTournamentPlayers, setLoadingTournamentPlayers] = useState(false);

  const tournamentIsPro = !!(tournament?.logoUrl || tournament?.publicPageColors);
  const showProBadge = isLoggedIn && (!isPro || !tournamentIsPro);
  const proSectionsDisabled = !tournamentIsPro;

  const loadMatches = useCallback(async () => {
    if (!tournament?.id) return;
    setLoadingMatches(true);
    try {
      const data = await listMatches(tournament.id);
      setMatches(data);
    } catch {
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }, [tournament?.id]);

  useEffect(() => {
    if (!slugOrId) return;
    getTournament(slugOrId)
      .then(setTournament)
      .catch(() => setTournament(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  useEffect(() => {
    if (tournament?.id) loadMatches();
  }, [tournament?.id, loadMatches]);

  const loadStandings = useCallback(async () => {
    if (!tournament?.id) return;
    setLoadingStandings(true);
    try {
      const { standings: data, standingsGeneral, standingsByGroup: byGroup } = await getStandings(tournament.id);
      setStandings(standingsGeneral ?? data);
      setStandingsByGroup(byGroup ?? []);
    } catch {
      setStandings([]);
      setStandingsByGroup([]);
    } finally {
      setLoadingStandings(false);
    }
  }, [tournament?.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: matches triggers reload when results change
  useEffect(() => {
    if (tournament?.id && (tournament.teams?.length ?? 0) > 0) loadStandings();
    else {
      setStandings([]);
      setStandingsByGroup([]);
    }
  }, [tournament?.id, tournament?.teams?.length, loadStandings, matches]);

  useEffect(() => {
    if (!tournament?.id) {
      setTournamentPlayers([]);
      setTournamentPlayersTotal(0);
      return;
    }
    setLoadingTournamentPlayers(true);
    getTournamentPlayers(tournament.id, {
      page: tournamentPlayersPage,
      limit: TOURNAMENT_PLAYERS_PAGE_SIZE,
      ageCategoryId: tournamentPlayersAgeCategoryFilter ?? undefined,
    })
      .then((res) => {
        setTournamentPlayers(res.players);
        setTournamentPlayersTotal(res.total);
      })
      .catch(() => {
        setTournamentPlayers([]);
        setTournamentPlayersTotal(0);
      })
      .finally(() => setLoadingTournamentPlayers(false));
  }, [tournament?.id, tournamentPlayersPage, tournamentPlayersAgeCategoryFilter]);

  useEffect(() => {
    if (!addTeamOpen || addTeamMode !== 'existing' || !tournament?.id || !(tournament.logoUrl || tournament.publicPageColors)) return;
    setAvailableTeamsLoading(true);
    listAvailableTeams(tournament.id)
      .then(setAvailableTeams)
      .catch(() => setAvailableTeams([]))
      .finally(() => setAvailableTeamsLoading(false));
  }, [addTeamOpen, addTeamMode, tournament?.id, tournament?.logoUrl, tournament?.publicPageColors]);

  useEffect(() => {
    if (!tournament?.isTournamentAdmin) return;
    const homeIds = [...new Set(matches.map((m) => m.homeTeamId).filter(Boolean))];
    if (homeIds.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const result: Record<string, TeamVenue[]> = {};
      for (const teamId of homeIds) {
        try {
          const venues = await listTeamVenues(teamId);
          if (!cancelled) result[teamId] = venues;
        } catch {
          if (!cancelled) result[teamId] = [];
        }
      }
      if (!cancelled) setHomeTeamVenues(result);
    };
    load();
    return () => { cancelled = true; };
  }, [matches, tournament?.isTournamentAdmin]);

  useEffect(() => {
    if (!tournament?.id || !tournament?.isTournamentAdmin) {
      setPlayerChangeRequests([]);
      return;
    }
    setLoadingPlayerRequests(true);
    listPlayerChangeRequests(tournament.id, 'pending')
      .then(setPlayerChangeRequests)
      .catch(() => setPlayerChangeRequests([]))
      .finally(() => setLoadingPlayerRequests(false));
  }, [tournament?.id, tournament?.isTournamentAdmin]);

  useEffect(() => {
    if (!viewChangesRequestId) {
      setViewChangesRequestDetail(null);
      return;
    }
    let cancelled = false;
    getPlayerChangeRequest(viewChangesRequestId)
      .then((detail) => {
        if (!cancelled) {
          setViewChangesRequestDetail((prev) => ({
            ...detail,
            team: detail.team ?? prev?.team,
            requestedByUser: detail.requestedByUser ?? prev?.requestedByUser,
            teamOwner: detail.teamOwner ?? prev?.teamOwner,
          }));
        }
      })
      .catch(() => {
        if (!cancelled) setViewChangesRequestDetail(null);
      });
    return () => { cancelled = true; };
  }, [viewChangesRequestId]);

  const handleApprovePlayerRequest = async (requestId: string) => {
    setPlayerRequestActionId(requestId);
    try {
      await approvePlayerChangeRequest(requestId);
      setPlayerChangeRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (tournament?.id) {
        const updated = await getTournament(slugOrId ?? '');
        setTournament(updated);
      }
    } finally {
      setPlayerRequestActionId(null);
    }
  };

  const handleRejectPlayerRequest = async (requestId: string) => {
    setPlayerRequestActionId(requestId);
    try {
      await rejectPlayerChangeRequest(requestId);
      setPlayerChangeRequests((prev) => prev.filter((r) => r.id !== requestId));
    } finally {
      setPlayerRequestActionId(null);
    }
  };

  useEffect(() => {
    if (!editResultOpen || !editResultMatch) return;
    let cancelled = false;
    const load = async () => {
      try {
        const homeId = editResultMatch?.homeTeamId;
        const awayId = editResultMatch?.awayTeamId;
        if (!homeId || !awayId) return;
        const [homeTeam, awayTeam] = await Promise.all([
          getTeam(homeId),
          getTeam(awayId),
        ]);
        if (!cancelled) {
          setEditResultHomePlayers(homeTeam.players ?? []);
          setEditResultAwayPlayers(awayTeam.players ?? []);
        }
      } catch {
        if (!cancelled) {
          setEditResultHomePlayers([]);
          setEditResultAwayPlayers([]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [editResultOpen, editResultMatch]);

  const standingsSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleStandingsDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !tournament?.isTournamentAdmin || !tournamentIsPro) return;
    const oldIndex = standings.findIndex((r) => r.teamId === active.id);
    const newIndex = standings.findIndex((r) => r.teamId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(standings, oldIndex, newIndex);
    setStandings(reordered);
    try {
      const updated = await updateTournamentStandingsOrder(
        tournament.id,
        reordered.map((r) => r.teamId)
      );
      setTournament((prev) => (prev ? { ...prev, standingsOrder: updated.standingsOrder } : null));
    } catch {
      setStandings(standings);
    }
  };

  const handleGroupStandingsDragEnd = async (groupId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !tournament?.isTournamentAdmin || !tournamentIsPro) return;
    const gr = standingsByGroup.find((g) => g.groupId === groupId);
    if (!gr) return;
    const oldIndex = gr.standings.findIndex((r) => r.teamId === active.id);
    const newIndex = gr.standings.findIndex((r) => r.teamId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedGroup = arrayMove(gr.standings, oldIndex, newIndex);
    const newFullOrder = standingsByGroup.flatMap((g) =>
      g.groupId === groupId ? reorderedGroup.map((r) => r.teamId) : g.standings.map((r) => r.teamId)
    );
    setStandingsByGroup((prev) =>
      prev.map((g) => (g.groupId === groupId ? { ...g, standings: reorderedGroup } : g))
    );
    const orderMap = new Map(newFullOrder.map((id, i) => [id, i]));
    setStandings((prev) => [...prev].sort((a, b) => (orderMap.get(a.teamId) ?? 0) - (orderMap.get(b.teamId) ?? 0)));
    try {
      const updated = await updateTournamentStandingsOrder(tournament.id, newFullOrder);
      setTournament((prev) => (prev ? { ...prev, standingsOrder: updated.standingsOrder } : null));
    } catch {
      loadStandings();
    }
  };

  const customColors = tournament?.publicPageColors;
  const pageTheme = customColors
    ? createTheme({
        ...theme,
        palette: {
          ...theme.palette,
          primary: {
            main: customColors.primary || theme.palette.primary.main,
            light: customColors.primary || theme.palette.primary.light,
            dark: customColors.primary || theme.palette.primary.dark,
          },
          secondary: customColors.secondary
            ? { main: customColors.secondary, light: customColors.secondary, dark: customColors.secondary }
            : theme.palette.secondary,
        },
      })
    : theme;

  const teams = tournament?.teams || [];

  const filteredAndSortedMatches = useMemo(() => {
    const q = matchesFilter.toLowerCase().trim();
    let list = matches;
    if (q) {
      list = list.filter(
        (m) =>
          m.homeTeam?.name?.toLowerCase().includes(q) ||
          m.awayTeam?.name?.toLowerCase().includes(q) ||
          m.group?.name?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (matchesSortBy === 'group') {
        const ga = a.group?.name ?? '';
        const gb = b.group?.name ?? '';
        cmp = ga.localeCompare(gb);
      } else if (matchesSortBy === 'home') {
        cmp = (a.homeTeam?.name ?? '').localeCompare(b.homeTeam?.name ?? '');
      } else if (matchesSortBy === 'away') {
        cmp = (a.awayTeam?.name ?? '').localeCompare(b.awayTeam?.name ?? '');
      } else {
        const sa = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const sb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        cmp = sa - sb;
      }
      return matchesSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [matches, matchesFilter, matchesSortBy, matchesSortOrder]);

  const paginatedMatches = useMemo(() => {
    const start = matchesPage * matchesRowsPerPage;
    return filteredAndSortedMatches.slice(start, start + matchesRowsPerPage);
  }, [filteredAndSortedMatches, matchesPage, matchesRowsPerPage]);

  const topScorers = useMemo(() => {
    const map = new Map<string, { playerName: string; teamName: string; goals: number }>();
    for (const m of matches) {
      const goals = (m.matchEvents ?? []).filter((e) => e.type === 'goal' && !e.ownGoal);
      for (const g of goals) {
        const key = g.playerId ?? g.playerName ?? 'unknown';
        const teamName = g.teamSide === 'home' ? (m.homeTeam?.name ?? '') : (m.awayTeam?.name ?? '');
        const prev = map.get(key);
        if (prev) {
          prev.goals += 1;
        } else {
          map.set(key, { playerName: g.playerName ?? '-', teamName, goals: 1 });
        }
      }
    }
    return [...map.entries()]
      .map(([, v]) => v)
      .filter((s) => s.goals > 0)
      .sort((a, b) => b.goals - a.goals);
  }, [matches]);

  const cardsByMatch = useMemo(() => {
    const rows: Array<{ matchId: string; date: string; matchLabel: string; type: 'yellow_card' | 'red_card'; playerName: string; minute?: number }> = [];
    for (const m of matches) {
      const cards = (m.matchEvents ?? []).filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
      const matchLabel = `${m.homeTeam?.name ?? '-'} vs ${m.awayTeam?.name ?? '-'}`;
      const date = m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : '-';
      for (const c of cards) {
        rows.push({
          matchId: m.id,
          date,
          matchLabel,
          type: c.type as 'yellow_card' | 'red_card',
          playerName: c.playerName ?? '-',
          minute: c.minute,
        });
      }
    }
    return rows.sort((a, b) => {
      const da = matches.find((m) => m.id === a.matchId)?.scheduledAt ?? '';
      const db = matches.find((m) => m.id === b.matchId)?.scheduledAt ?? '';
      return new Date(da).getTime() - new Date(db).getTime();
    });
  }, [matches]);

  const handleMatchesSort = (field: typeof matchesSortBy) => {
    if (matchesSortBy === field) {
      setMatchesSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setMatchesSortBy(field);
      setMatchesSortOrder('asc');
    }
    setMatchesPage(0);
  };

  const sortedPlayerChangeRequests = useMemo(() => {
    const list = [...playerChangeRequests];
    list.sort((a, b) => {
      let cmp = 0;
      if (playerRequestsSortBy === 'requestDate') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (playerRequestsSortBy === 'team') {
        cmp = (a.team?.name ?? '').localeCompare(b.team?.name ?? '');
      } else if (playerRequestsSortBy === 'requestType') {
        const ta = a.type === 'add' ? 'add' : a.type === 'edit' ? 'edit' : 'delete';
        const tb = b.type === 'add' ? 'add' : b.type === 'edit' ? 'edit' : 'delete';
        cmp = ta.localeCompare(tb);
      } else {
        cmp = (a.requestedByUser?.name ?? '').localeCompare(b.requestedByUser?.name ?? '');
      }
      return playerRequestsSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [playerChangeRequests, playerRequestsSortBy, playerRequestsSortOrder]);

  const handlePlayerRequestsSort = (field: typeof playerRequestsSortBy) => {
    if (playerRequestsSortBy === field) {
      setPlayerRequestsSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setPlayerRequestsSortBy(field);
      setPlayerRequestsSortOrder(field === 'requestDate' ? 'desc' : 'asc');
    }
  };

  const sortedTeams = useMemo(() => {
    const list = [...teams];
    list.sort((a, b) => {
      const cmp = (a.name ?? '').localeCompare(b.name ?? '');
      return teamsSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [teams, teamsSortOrder]);

  const handleTeamsSort = () => {
    setTeamsSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
  };

  const sortedTournamentPlayers = useMemo(() => {
    const list = [...tournamentPlayers];
    list.sort((a, b) => {
      let cmp = 0;
      if (tournamentPlayersSortBy === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '');
      } else if (tournamentPlayersSortBy === 'birthDate') {
        const da = a.birthDate ?? (a.birthYear != null ? String(a.birthYear) : '');
        const db = b.birthDate ?? (b.birthYear != null ? String(b.birthYear) : '');
        cmp = da.localeCompare(db);
      } else {
        cmp = (a.teamName ?? '').localeCompare(b.teamName ?? '');
      }
      return tournamentPlayersSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [tournamentPlayers, tournamentPlayersSortBy, tournamentPlayersSortOrder]);

  const handleTournamentPlayersSort = (field: typeof tournamentPlayersSortBy) => {
    if (tournamentPlayersSortBy === field) {
      setTournamentPlayersSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setTournamentPlayersSortBy(field);
      setTournamentPlayersSortOrder('asc');
    }
  };

  const sortedStandings = useMemo(() => {
    const list = [...standings];
    list.sort((a, b) => {
      let cmp = 0;
      if (standingsSortBy === 'team') {
        cmp = (a.teamName ?? '').localeCompare(b.teamName ?? '');
      } else if (standingsSortBy === 'points') {
        cmp = (a.points ?? 0) - (b.points ?? 0);
      } else if (standingsSortBy === 'played') {
        cmp = (a.played ?? 0) - (b.played ?? 0);
      } else {
        cmp = ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0)) - ((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0));
      }
      return standingsSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [standings, standingsSortBy, standingsSortOrder]);

  const handleStandingsSort = (field: typeof standingsSortBy) => {
    if (standingsSortBy === field) {
      setStandingsSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setStandingsSortBy(field);
      setStandingsSortOrder(field === 'team' ? 'asc' : 'desc');
    }
  };

  const sortedStandingsByGroup = useMemo(() => {
    return standingsByGroup.map(({ groupId, groupName, standings: groupStandings }) => {
      const list = [...groupStandings];
      list.sort((a, b) => {
        let cmp = 0;
        if (standingsSortBy === 'team') {
          cmp = (a.teamName ?? '').localeCompare(b.teamName ?? '');
        } else if (standingsSortBy === 'points') {
          cmp = (a.points ?? 0) - (b.points ?? 0);
        } else if (standingsSortBy === 'played') {
          cmp = (a.played ?? 0) - (b.played ?? 0);
        } else {
          cmp = ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0)) - ((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0));
        }
        return standingsSortOrder === 'asc' ? cmp : -cmp;
      });
      return { groupId, groupName, standings: list };
    });
  }, [standingsByGroup, standingsSortBy, standingsSortOrder]);

  const sortedTopScorers = useMemo(() => {
    const list = [...topScorers];
    list.sort((a, b) => {
      let cmp = 0;
      if (topScorersSortBy === 'player') {
        cmp = (a.playerName ?? '').localeCompare(b.playerName ?? '');
      } else if (topScorersSortBy === 'team') {
        cmp = (a.teamName ?? '').localeCompare(b.teamName ?? '');
      } else {
        cmp = (a.goals ?? 0) - (b.goals ?? 0);
      }
      return topScorersSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [topScorers, topScorersSortBy, topScorersSortOrder]);

  const handleTopScorersSort = (field: typeof topScorersSortBy) => {
    if (topScorersSortBy === field) {
      setTopScorersSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setTopScorersSortBy(field);
      setTopScorersSortOrder(field === 'goals' ? 'desc' : 'asc');
    }
  };

  const sortedCardsByMatch = useMemo(() => {
    const list = [...cardsByMatch];
    list.sort((a, b) => {
      let cmp = 0;
      if (cardsByMatchSortBy === 'date') {
        const da = matches.find((m) => m.id === a.matchId)?.scheduledAt ?? '';
        const db = matches.find((m) => m.id === b.matchId)?.scheduledAt ?? '';
        cmp = new Date(da).getTime() - new Date(db).getTime();
      } else if (cardsByMatchSortBy === 'match') {
        cmp = (a.matchLabel ?? '').localeCompare(b.matchLabel ?? '');
      } else if (cardsByMatchSortBy === 'player') {
        cmp = (a.playerName ?? '').localeCompare(b.playerName ?? '');
      } else {
        cmp = (a.minute ?? 0) - (b.minute ?? 0);
      }
      return cardsByMatchSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [cardsByMatch, cardsByMatchSortBy, cardsByMatchSortOrder, matches]);

  const handleCardsByMatchSort = (field: typeof cardsByMatchSortBy) => {
    if (cardsByMatchSortBy === field) {
      setCardsByMatchSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setCardsByMatchSortBy(field);
      setCardsByMatchSortOrder(field === 'date' ? 'asc' : 'asc');
    }
  };

  const hasMatchesWithScores = matches.some((m) => m.homeScore != null && m.awayScore != null);
  const tournamentEndDatePassed = tournament?.endDate ? new Date(tournament.endDate) < new Date() : false;
  const canDeleteAndRegenerateSchedule = !hasMatchesWithScores || tournamentEndDatePassed;

  if (loading || !tournament) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">
            {loading ? t('app.tournaments.loading') : t('tournament.detail.notFound')}
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  const isAdminView = isLoggedIn && tournament.isTournamentAdmin;
  if (!isAdminView) {
    return (
      <PublicTournamentView
        tournament={tournament}
        matches={matches}
        standings={standings}
        standingsByGroup={standingsByGroup}
        loadingMatches={loadingMatches}
        loadingStandings={loadingStandings}
      />
    );
  }

  return (
    <ThemeProvider theme={pageTheme}>
      <Box sx={{ minHeight: embedded ? undefined : '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        {!embedded && (
          <AppBar
            title={tournament.name}
            showBackButton
            onBackClick={() => navigate(-1)}
            backAriaLabel={t('tournament.create.back')}
          />
        )}

        <Box component="main" sx={{ flex: 1, py: { xs: 2, sm: 4 }, px: { xs: 0, sm: 0 } }}>
          <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {tournament.logoUrl ? (
                  <Box
                    component="img"
                    src={tournament.logoUrl}
                    alt={tournament.name}
                    sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={logoUrl}
                    alt="LigaMatch"
                    sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'contain', p: 0.5 }}
                  />
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={600} color="primary.main">
                    {tournament.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(`tournament.create.sport.options.${tournament.sport}`) || tournament.sport}
                    {tournament.location && ` · ${tournament.location}`}
                  </Typography>
                </Box>
                {showProBadge && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ImageIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.disabled' }} />
                    <ProBadge />
                  </Box>
                )}
              </Box>

              {tournament.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {tournament.description}
                </Typography>
              )}

              {tournament.status === 'suspended' && (
                <Chip
                  label={t('tournament.detail.suspended')}
                  color="warning"
                  sx={{ mb: 2 }}
                />
              )}

              {isLoggedIn && tournament.isTournamentAdmin && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      const cats = tournament.ageCategories?.length
                        ? tournament.ageCategories.map((c) => ({
                            id: c.id,
                            name: c.name,
                            minBirthYear: c.minBirthYear,
                            maxBirthYear: c.maxBirthYear,
                          }))
                        : [{ id: `cat-${Date.now()}`, name: '', minBirthYear: new Date().getFullYear() - 50, maxBirthYear: new Date().getFullYear() }];
                      setEditTournamentForm({
                        name: tournament.name,
                        sport: tournament.sport,
                        categoryType: tournament.categoryType || 'none',
                        description: tournament.description || '',
                        startDate: tournament.startDate ? toLocalDateString(tournament.startDate) || tournament.startDate : '',
                        endDate: tournament.endDate ? toLocalDateString(tournament.endDate) || tournament.endDate : '',
                        location: tournament.location || '',
                        tournamentType: tournament.tournamentType || (tournament.categoryType === 'ages' ? 'ages' : 'open'),
                        isSingleVenue: tournament.isSingleVenue ?? false,
                        venueName: tournament.venueName || '',
                        ageCategories: cats,
                      });
                      setEditTournamentError('');
                      setEditTournamentOpen(true);
                    }}
                  >
                    {t('tournament.detail.edit')}
                  </Button>
                  {tournament.status === 'active' ? (
                    <Button
                      variant="outlined"
                      size="small"
                      color="warning"
                      startIcon={<PauseCircleIcon />}
                      onClick={() => setConfirmSuspendOpen(true)}
                    >
                      {t('tournament.detail.suspend')}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      startIcon={<PlayCircleIcon />}
                      onClick={() => setConfirmRenewOpen(true)}
                    >
                      {t('tournament.detail.renew')}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    {t('tournament.detail.delete')}
                  </Button>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                {tournament.startDate && (
                  <Typography variant="body2">
                    {t('tournament.detail.startDate')}: {tournament.startDate}
                  </Typography>
                )}
                {tournament.endDate && (
                  <Typography variant="body2">
                    {t('tournament.detail.endDate')}: {tournament.endDate}
                  </Typography>
                )}
              </Box>

              {isLoggedIn && tournament.isTournamentAdmin && (
                <>
                  {/* PRO: Make public */}
                  <Card
                    variant="outlined"
                    sx={{
                      mb: 2,
                      opacity: proSectionsDisabled ? 0.7 : 1,
                      pointerEvents: proSectionsDisabled ? 'none' : 'auto',
                    }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PublicIcon color={tournament.isPublic && !proSectionsDisabled ? 'primary' : 'disabled'} />
                        <Typography>
                          {tournament.isPublic && !proSectionsDisabled
                            ? t('tournament.detail.publicEnabled')
                            : t('tournament.detail.makePublic')}
                        </Typography>
                      </Box>
                      {showProBadge && (
                        proSectionsDisabled ? (
                          <Chip label={t('app.myTournaments.convertToPro')} size="small" color="secondary" />
                        ) : (
                          <ProBadge />
                        )
                      )}
                    </CardContent>
                  </Card>

                  {/* PRO: Custom colors - only open when tournament is PRO */}
                  <Card
                    variant="outlined"
                    sx={{
                      mb: 2,
                      opacity: proSectionsDisabled ? 0.7 : 1,
                      cursor: tournamentIsPro ? 'pointer' : 'default',
                      pointerEvents: proSectionsDisabled ? 'none' : 'auto',
                      '&:hover': tournamentIsPro ? { bgcolor: 'action.hover' } : undefined,
                    }}
                    onClick={() => tournamentIsPro && setColorsDialogOpen(true)}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PaletteIcon color={proSectionsDisabled ? 'disabled' : 'primary'} />
                        <Typography>
                          {t('tournament.detail.customColors')}
                        </Typography>
                      </Box>
                      {showProBadge && (
                        proSectionsDisabled ? (
                          <Chip label={t('app.myTournaments.convertToPro')} size="small" color="secondary" />
                        ) : (
                          <ProBadge />
                        )
                      )}
                    </CardContent>
                  </Card>

                  {/* Generate report - only works when PRO */}
                  <Card
                    variant="outlined"
                    sx={{
                      mb: 2,
                      opacity: proSectionsDisabled ? 0.7 : 1,
                      cursor: tournamentIsPro ? 'pointer' : 'default',
                      pointerEvents: proSectionsDisabled ? 'none' : 'auto',
                      '&:hover': tournamentIsPro ? { bgcolor: 'action.hover' } : undefined,
                    }}
                    onClick={() => tournamentIsPro && setReportDialogOpen(true)}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PictureAsPdfIcon color={proSectionsDisabled ? 'disabled' : 'primary'} />
                        <Typography>{t('tournament.report.title')}</Typography>
                      </Box>
                      {showProBadge && proSectionsDisabled && (
                        <Chip label={t('app.myTournaments.convertToPro')} size="small" color="secondary" />
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </Paper>

            

            {/* Dialog: Ver cambios de solicitud de jugador */}
            <Dialog
              open={viewChangesRequestId !== null}
              onClose={() => setViewChangesRequestId(null)}
              maxWidth="sm"
              fullWidth
              scroll="paper"
            >
              {(() => {
                const selectedReq = viewChangesRequestDetail;
                if (!selectedReq) {
                  return (
                    <>
                      <DialogTitle>{t('playerChangeRequests.viewChangesTitle')}</DialogTitle>
                      <DialogContent>
                        <Typography color="text.secondary">
                          {viewChangesRequestId ? t('app.myTournaments.loading') : '—'}
                        </Typography>
                      </DialogContent>
                      <DialogActions>
                        <Button onClick={() => setViewChangesRequestId(null)}>{t('playerChangeRequests.close')}</Button>
                      </DialogActions>
                    </>
                  );
                }
                const ageCategories = tournament?.ageCategories ?? [];
                const getCategoryName = (id: string | null | undefined) =>
                  id ? ageCategories.find((c) => c.id === id)?.name ?? id : null;
                // Normalize payload: API may return string (jsonb) or object; support snake_case keys
                let rawPayload: unknown = selectedReq.payload;
                if (typeof rawPayload === 'string') {
                  try {
                    rawPayload = JSON.parse(rawPayload) as Record<string, unknown>;
                  } catch {
                    rawPayload = {};
                  }
                }
                const payloadObj = (rawPayload && typeof rawPayload === 'object' ? rawPayload : {}) as Record<string, unknown>;
                const p: Record<string, unknown> = {};
                const snakeToCamel: Record<string, string> = {
                  birth_year: 'birthYear', birth_date: 'birthDate', first_name: 'firstName', last_name: 'lastName',
                  tournament_age_category_id: 'tournamentAgeCategoryId', id_document_type: 'idDocumentType',
                  id_document_number: 'idDocumentNumber', guardian_name: 'guardianName', guardian_relation: 'guardianRelation',
                  guardian_phone: 'guardianPhone', guardian_email: 'guardianEmail', photo_url: 'photoUrl',
                  guardian_id_number: 'guardianIdNumber',
                };
                for (const [k, v] of Object.entries(payloadObj)) {
                  const key = snakeToCamel[k] ?? k;
                  p[key] = v;
                }
                type PayloadLike = {
                  name?: string; firstName?: string | null; lastName?: string | null;
                  birthYear?: number; birthDate?: string | null; tournamentAgeCategoryId?: string | null;
                  idDocumentType?: string | null; idDocumentNumber?: string | null;
                  guardianName?: string | null; guardianRelation?: string | null;
                  guardianPhone?: string | null; guardianEmail?: string | null;
                };
                const pTyped = p as PayloadLike;
                const payloadName =
                  pTyped.name ||
                  [pTyped.firstName, pTyped.lastName].filter(Boolean).join(' ') ||
                  null;
                const currName = selectedReq.player
                  ? selectedReq.player.name ||
                    [selectedReq.player.firstName, selectedReq.player.lastName].filter(Boolean).join(' ') ||
                    '—'
                  : '—';
                type PlayerLike = {
                  name?: string;
                  firstName?: string | null;
                  lastName?: string | null;
                  birthYear?: number;
                  birthDate?: string | null;
                  tournamentAgeCategoryId?: string | null;
                  idDocumentType?: string | null;
                  idDocumentNumber?: string | null;
                  guardianName?: string | null;
                  guardianRelation?: string | null;
                  guardianPhone?: string | null;
                  guardianEmail?: string | null;
                };
                const curr = (selectedReq.player ?? {}) as PlayerLike;
                const changeLines: Array<{ label: string; current: string; requested: string } | { label: string; value: string }> = [];
                if (selectedReq.type === 'add') {
                  if (payloadName) changeLines.push({ label: t('playerChangeRequests.fieldName'), value: payloadName });
                  if (pTyped.birthYear != null) changeLines.push({ label: t('playerChangeRequests.fieldBirthYear'), value: String(pTyped.birthYear) });
                  if (pTyped.birthDate) changeLines.push({ label: t('playerChangeRequests.fieldBirthDate'), value: formatBirthDateMMDDYYYY(pTyped.birthDate) || pTyped.birthDate });
                  const catName = getCategoryName(pTyped.tournamentAgeCategoryId ?? undefined);
                  if (catName) changeLines.push({ label: t('playerChangeRequests.fieldCategory'), value: catName });
                  if (pTyped.idDocumentType != null) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentType'), value: pTyped.idDocumentType || '—' });
                  if (pTyped.idDocumentNumber != null) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentNumber'), value: pTyped.idDocumentNumber || '—' });
                  if (pTyped.guardianName != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianName'), value: pTyped.guardianName || '—' });
                  if (pTyped.guardianRelation != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianRelation'), value: pTyped.guardianRelation || '—' });
                  if (pTyped.guardianPhone != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianPhone'), value: pTyped.guardianPhone || '—' });
                  if (pTyped.guardianEmail != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianEmail'), value: pTyped.guardianEmail || '—' });
                } else if (selectedReq.type === 'edit') {
                  const fmt = (v: string | number | null | undefined) => (v === undefined || v === null || v === '' ? '—' : String(v));
                  const requestedName = pTyped.name ?? ([pTyped.firstName, pTyped.lastName].filter(Boolean).join(' ') || undefined);
                  if ('name' in p || 'firstName' in p || 'lastName' in p) {
                    changeLines.push({ label: t('playerChangeRequests.fieldName'), current: currName, requested: fmt(requestedName) });
                  }
                  if ('birthYear' in p) changeLines.push({ label: t('playerChangeRequests.fieldBirthYear'), current: fmt(curr.birthYear), requested: fmt(pTyped.birthYear) });
                  if ('birthDate' in p) changeLines.push({ label: t('playerChangeRequests.fieldBirthDate'), current: formatBirthDateMMDDYYYY(curr.birthDate) || fmt(curr.birthDate), requested: formatBirthDateMMDDYYYY(pTyped.birthDate) || fmt(pTyped.birthDate) });
                  if ('tournamentAgeCategoryId' in p) {
                    const currCat = getCategoryName(curr.tournamentAgeCategoryId) ?? '—';
                    const reqCat = getCategoryName(pTyped.tournamentAgeCategoryId ?? undefined) ?? '—';
                    changeLines.push({ label: t('playerChangeRequests.fieldCategory'), current: currCat, requested: reqCat });
                  }
                  if ('idDocumentType' in p) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentType'), current: fmt(curr.idDocumentType), requested: fmt(pTyped.idDocumentType) });
                  if ('idDocumentNumber' in p) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentNumber'), current: fmt(curr.idDocumentNumber), requested: fmt(pTyped.idDocumentNumber) });
                  if ('guardianName' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianName'), current: fmt(curr.guardianName), requested: fmt(pTyped.guardianName) });
                  if ('guardianRelation' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianRelation'), current: fmt(curr.guardianRelation), requested: fmt(pTyped.guardianRelation) });
                  if ('guardianPhone' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianPhone'), current: fmt(curr.guardianPhone), requested: fmt(pTyped.guardianPhone) });
                  if ('guardianEmail' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianEmail'), current: fmt(curr.guardianEmail), requested: fmt(pTyped.guardianEmail) });
                } else if (selectedReq.type === 'delete') {
                  if (selectedReq.player) changeLines.push({ label: t('playerChangeRequests.fieldName'), value: selectedReq.player.name ?? '—' });
                }
                return (
                  <>
                    <DialogTitle>{t('playerChangeRequests.viewChangesTitle')}</DialogTitle>
                    <DialogContent>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0 }}>
                        <Typography variant="body2"><strong>{t('playerChangeRequests.requestDate')}:</strong> {selectedReq.createdAt ? new Date(selectedReq.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}</Typography>
                        <Typography variant="body2"><strong>{t('playerChangeRequests.team')}:</strong> {selectedReq.team?.name ?? '—'}</Typography>
                        <Typography variant="body2"><strong>{t('playerChangeRequests.teamOwner')}:</strong> {selectedReq.teamOwner?.name ?? '—'}</Typography>
                        <Typography variant="body2">
                          <strong>{t('playerChangeRequests.requestType')}:</strong>{' '}
                          {selectedReq.type === 'add'
                            ? t('playerChangeRequests.typeAdd')
                            : selectedReq.type === 'edit'
                              ? t('playerChangeRequests.typeEdit')
                              : t('playerChangeRequests.typeDelete')}
                          {selectedReq.type === 'add' && payloadName ? `: ${payloadName}` : ''}
                          {selectedReq.type === 'edit' && selectedReq.player ? ` (${selectedReq.player.name ?? '—'})` : ''}
                          {selectedReq.type === 'delete' && selectedReq.player ? `: ${selectedReq.player.name ?? '—'}` : ''}
                        </Typography>
                        <Typography variant="body2"><strong>{t('playerChangeRequests.requestedBy')}:</strong> {selectedReq.requestedByUser?.name ?? '—'}</Typography>
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('playerChangeRequests.requestedChanges')}</Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'disc' }}>
                          {changeLines.length === 0 ? (
                            <Typography component="li" variant="body2" color="text.secondary">—</Typography>
                          ) : (
                            changeLines.map((line, idx) => (
                              <Typography key={`${selectedReq.id}-${line.label}-${idx}`} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.25, wordBreak: 'break-word' }}>
                                {'current' in line && 'requested' in line ? (
                                  <><strong>{line.label}:</strong> {line.current} → {line.requested}</>
                                ) : (
                                  <><strong>{line.label}:</strong> {(line as { value: string }).value}</>
                                )}
                              </Typography>
                            ))
                          )}
                        </Box>
                      </Box>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setViewChangesRequestId(null)}>{t('playerChangeRequests.close')}</Button>
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={playerRequestActionId === selectedReq.id}
                        onClick={async () => {
                          await handleApprovePlayerRequest(selectedReq.id);
                          setViewChangesRequestId(null);
                        }}
                      >
                        {t('playerChangeRequests.approve')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={playerRequestActionId === selectedReq.id}
                        onClick={async () => {
                          await handleRejectPlayerRequest(selectedReq.id);
                          setViewChangesRequestId(null);
                        }}
                      >
                        {t('playerChangeRequests.reject')}
                      </Button>
                    </DialogActions>
                  </>
                );
              })()}
            </Dialog>

            {/* Registered teams */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupsIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      {t('tournament.detail.registeredTeams')}
                    </Typography>
                  </Box>
                  {isLoggedIn && tournament.isTournamentAdmin && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setAddTeamOpen(true);
                          setAddTeamName('');
                          setAddTeamDesc('');
                          setAddTeamEmail('');
                          setAddTeamError('');
                        }}
                      >
                        {t('team.add.title')}
                      </Button>
                      {embedded && onOpenCreateTeam ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onOpenCreateTeam(tournament.slug || tournament.id)}
                        >
                          {t('app.nav.createTeam')}
                        </Button>
                      ) : (
                        <Button
                          component={Link}
                          to="/dashboard"
                          state={{ section: 'createTeam', createTeamTournamentSlugOrId: tournament.slug || tournament.id }}
                          size="small"
                          variant="outlined"
                        >
                          {t('app.nav.createTeam')}
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
                {teams.length === 0 ? (
                  <Typography color="text.secondary">{t('tournament.detail.noTeams')}</Typography>
                ) : (
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 360 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 60 }}>#</TableCell>
                          <TableCell sortDirection={teamsSortOrder}>
                            <TableSortLabel
                              active
                              direction={teamsSortOrder}
                              onClick={handleTeamsSort}
                            >
                              {t('tournament.detail.team')}
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedTeams.map((team, idx) => (
                          <TableRow key={team.id}>
                            <TableCell sx={{ width: 60 }}>{idx + 1}</TableCell>
                            <TableCell>
                              {isLoggedIn && tournament.isTournamentAdmin ? (
                                <Button
                                  variant="text"
                                  size="small"
                                  title={t('tournament.detail.viewTeamData')}
                                  sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                                  onClick={() =>
                                    navigate('/dashboard', {
                                      state: {
                                        section: 'tournaments',
                                        selectedTournamentSlugOrId: slugOrId,
                                        selectedTeamIdInTournament: team.id,
                                        selectedTeamName: team.name,
                                      },
                                    })
                                  }
                                >
                                  {team.name}
                                </Button>
                              ) : (
                                team.name
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {/* Matches / Calendar */}
            <Card
              elevation={0}
              sx={{
                mt: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      {t('tournament.matches.title')}
                    </Typography>
                  </Box>
                  {isLoggedIn && tournament.isTournamentAdmin && teams.length >= 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Tooltip title={!tournamentIsPro ? t('tournament.matches.addMatchProOnly') : ''}>
                        <span>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            disabled={!tournamentIsPro}
                            onClick={() => {
                              if (!tournamentIsPro) return;
                              setAddMatchForm({
                                homeTeamId: '',
                                awayTeamId: '',
                                reason: 'administrative',
                                suspendedMatchId: '',
                                scheduledAt: toLocalDateTimeString(new Date()),
                              });
                              setAddMatchError('');
                              setAddMatchOpen(true);
                            }}
                          >
                            {t('tournament.matches.addMatch')}
                          </Button>
                        </span>
                      </Tooltip>
                      {matches.length > 0 ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setGenerateOpen(true)}
                        >
                          {t('tournament.matches.deleteAndRegenerate')}
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setGenerateOpen(true);
                            setGenerateRounds(1);
                            setGenerateMode('all');
                            setGenerateNumGroups(2);
                            setGenerateError('');
                          }}
                        >
                          {t('tournament.matches.generate')}
                        </Button>
                      )}
                      </Box>
                      {!tournamentIsPro && (
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.matches.addMatchProOnly')}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
                {loadingMatches ? (
                  <Typography color="text.secondary">
                    {t('tournament.matches.loading')}
                  </Typography>
                ) : matches.length === 0 ? (
                  <Typography color="text.secondary">
                    {t('tournament.matches.noMatches')}
                  </Typography>
                ) : (
                  <>
                    <TextField
                      size="small"
                      placeholder={t('tournament.matches.filterPlaceholder')}
                      value={matchesFilter}
                      onChange={(e) => {
                        setMatchesFilter(e.target.value);
                        setMatchesPage(0);
                      }}
                      sx={{ mb: 2, minWidth: 240 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    {(matches.some((m) => m.suspendedMatchId) || matches.some((m) => m.status === 'suspended')) && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('tournament.matches.legend')}:
                        </Typography>
                        {matches.some((m) => m.suspendedMatchId) && (
                          <Chip
                            label={t('tournament.matches.badgeRescheduled')}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        )}
                        {matches.some((m) => m.status === 'suspended') && (
                          <Chip
                            label={t('tournament.matches.suspended')}
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        )}
                      </Box>
                    )}
                    <TableContainer sx={{ overflowX: 'auto' }}>
                      <Table size="small" sx={{ minWidth: 400 }}>
                        <TableHead>
                          <TableRow>
                            {matches.some((m) => m.group) && (
                              <TableCell>
                                <TableSortLabel
                                  active={matchesSortBy === 'group'}
                                  direction={matchesSortBy === 'group' ? matchesSortOrder : 'asc'}
                                  onClick={() => handleMatchesSort('group')}
                                >
                                  {t('tournament.matches.group')}
                                </TableSortLabel>
                              </TableCell>
                            )}
                            <TableCell>
                              <TableSortLabel
                                active={matchesSortBy === 'home'}
                                direction={matchesSortBy === 'home' ? matchesSortOrder : 'asc'}
                                onClick={() => handleMatchesSort('home')}
                              >
                                {t('tournament.matches.home')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 80 }}>vs</TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={matchesSortBy === 'away'}
                                direction={matchesSortBy === 'away' ? matchesSortOrder : 'asc'}
                                onClick={() => handleMatchesSort('away')}
                              >
                                {t('tournament.matches.away')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={matchesSortBy === 'scheduledAt'}
                                direction={matchesSortBy === 'scheduledAt' ? matchesSortOrder : 'asc'}
                                onClick={() => handleMatchesSort('scheduledAt')}
                              >
                                {t('tournament.matches.scheduledAt')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ minWidth: 140 }}>
                              {t('tournament.matches.venue')}
                            </TableCell>
                            {isLoggedIn && tournament.isTournamentAdmin && <TableCell sx={{ width: 100 }} />}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedMatches.map((m) => (
                            <TableRow key={m.id}>
                              {matches.some((x) => x.group) && (
                                <TableCell>{m.group?.name ?? '—'}</TableCell>
                              )}
                              <TableCell sx={{ fontWeight: m.homeTeam ? 600 : 400 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {tournamentIsPro && (
                                    <Box
                                      component="img"
                                      src={m.homeTeam?.logoUrl || defaultTeamLogoUrl}
                                      alt=""
                                      sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }}
                                    />
                                  )}
                                  <span>{m.homeTeam?.name ?? '-'}</span>
                                </Box>
                              </TableCell>
                              <TableCell align="center" sx={{ width: 80 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                {isLoggedIn && tournament.isTournamentAdmin ? (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{ minWidth: 56 }}
                                    onClick={() => {
                                      setEditResultMatch(m);
                                      setEditResultHome(m.homeScore != null ? String(m.homeScore) : '');
                                      setEditResultAway(m.awayScore != null ? String(m.awayScore) : '');
                                      const stats: Record<string, { home: string; away: string }> = {};
                                      const statFields = getStatisticsForSport(tournament.sport);
                                      const matchStats = m.statistics ?? {};
                                      statFields.forEach((f) => {
                                        stats[f.key] = {
                                          home: String(matchStats[f.homeKey] ?? ''),
                                          away: String(matchStats[f.awayKey] ?? ''),
                                        };
                                      });
                                      setEditResultStats(stats);
                                      setEditResultMatchEvents(m.matchEvents ? [...m.matchEvents] : []);
                                      setEditResultExtraPoints({
                                        home: m.matchExtraPoints?.home != null ? String(m.matchExtraPoints.home) : '',
                                        away: m.matchExtraPoints?.away != null ? String(m.matchExtraPoints.away) : '',
                                      });
                                      setEditResultPenalties(
                                        (m.matchPenalties ?? []).map((p) => {
                                          const old = p as MatchPenalty & { pointsDeducted?: number };
                                          return {
                                            type: p.type,
                                            targetId: p.targetId,
                                            targetName: p.targetName,
                                            description: p.description,
                                            amount: p.amount ?? old.pointsDeducted,
                                            currency: p.currency ?? userCurrency,
                                          };
                                        })
                                      );
                                      setEditResultValidationError('');
                                      setEditResultOpen(true);
                                    }}
                                  >
                                    {m.homeScore != null && m.awayScore != null
                                      ? `${m.homeScore}–${m.awayScore}`
                                      : '—'}
                                  </Button>
                                ) : (
                                  <Typography variant="body2" fontWeight={500}>
                                    {m.homeScore != null && m.awayScore != null
                                      ? `${m.homeScore}–${m.awayScore}`
                                      : '—'}
                                  </Typography>
                                )}
                                <IconButton
                                  size="small"
                                  onClick={(e) => setMatchStatsPopover({ anchor: e.currentTarget, match: m })}
                                  aria-label={t('tournament.matches.viewStats')}
                                  sx={{ p: 0.25 }}
                                >
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontWeight: m.awayTeam ? 600 : 400 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {tournamentIsPro && (
                                    <Box
                                      component="img"
                                      src={m.awayTeam?.logoUrl || defaultTeamLogoUrl}
                                      alt=""
                                      sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }}
                                    />
                                  )}
                                  <span>{m.awayTeam?.name ?? '-'}</span>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {m.scheduledAt
                                  ? new Date(m.scheduledAt).toLocaleString()
                                  : '—'}
                              </TableCell>
                              <TableCell sx={{ minWidth: 140 }}>
                                {tournament.isSingleVenue ? (
                                  tournament.venueName ?? '—'
                                ) : isLoggedIn && tournament.isTournamentAdmin &&
                                  m.status !== 'suspended' &&
                                  (homeTeamVenues[m.homeTeamId]?.length ?? 0) > 0 ? (
                                  <Select
                                    size="small"
                                    value={m.venueId ?? ''}
                                    displayEmpty
                                    renderValue={(v) => m.venue?.name ?? (v ? homeTeamVenues[m.homeTeamId]?.find((x) => x.id === v)?.name : '—')}
                                    onChange={async (e) => {
                                      const venueId = e.target.value as string;
                                      try {
                                        const updated = await updateMatch(tournament.id, m.id, {
                                          venueId: venueId || null,
                                        });
                                        setMatches((prev) =>
                                          prev.map((x) => (x.id === updated.id ? updated : x))
                                        );
                                      } catch {
                                        /* ignore */
                                      }
                                    }}
                                    sx={{ minWidth: 120, fontSize: '0.8rem' }}
                                  >
                                    {homeTeamVenues[m.homeTeamId]?.map((v) => (
                                      <MenuItem key={v.id} value={v.id}>
                                        {v.name} {v.isOfficial ? `(${t('team.detail.venueOfficial')})` : `(${t('team.detail.venueAlternate')})`}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                ) : (
                                  m.venue?.name ?? '—'
                                )}
                              </TableCell>
                              {isLoggedIn && tournament.isTournamentAdmin && (
                                <TableCell sx={{ width: 100 }}>
                                  {m.status === 'suspended' ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Chip
                                        label={t('tournament.matches.suspended')}
                                        size="small"
                                        color="warning"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setRevertSuspendTarget(m);
                                          setConfirmRevertSuspendOpen(true);
                                        }}
                                        aria-label={t('tournament.matches.revertSuspend')}
                                        color="success"
                                        title={t('tournament.matches.revertSuspend')}
                                      >
                                        <UndoIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      {m.suspendedMatchId && (
                                        <Chip
                                          label={t('tournament.matches.badgeRescheduled')}
                                          size="small"
                                          color="info"
                                          sx={{ fontSize: '0.65rem', height: 20 }}
                                        />
                                      )}
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setEditMatch(m);
                                          setEditScheduledAt(
                                            m.scheduledAt
                                              ? toLocalDateTimeString(m.scheduledAt)
                                              : ''
                                          );
                                          setEditMatchOpen(true);
                                        }}
                                        aria-label={t('tournament.matches.editDate')}
                                      >
                                        <EditCalendarIcon fontSize="small" />
                                      </IconButton>
                                      <Tooltip title={m.homeScore != null && m.awayScore != null ? t('tournament.matches.suspendMatchWithResult') : ''}>
                                        <span>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              if (m.homeScore != null && m.awayScore != null) return;
                                              setSuspendMatchTarget(m);
                                              setConfirmSuspendMatchOpen(true);
                                            }}
                                            aria-label={t('tournament.matches.suspendMatch')}
                                            color="warning"
                                            disabled={m.homeScore != null && m.awayScore != null}
                                          >
                                            <BlockIcon fontSize="small" />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                      {m.isManual && (
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            setDeleteMatchTarget(m);
                                            setConfirmDeleteMatchOpen(true);
                                          }}
                                          aria-label={t('tournament.matches.deleteMatch')}
                                          color="error"
                                          title={t('tournament.matches.deleteMatch')}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      )}
                                    </Box>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {filteredAndSortedMatches.length > matchesRowsPerPage && (
                      <TablePagination
                        component="div"
                        count={filteredAndSortedMatches.length}
                        page={matchesPage}
                        onPageChange={(_, p) => setMatchesPage(p)}
                        rowsPerPage={matchesRowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setMatchesRowsPerPage(parseInt(e.target.value, 10));
                          setMatchesPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={t('tournament.matches.rowsPerPage')}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Standings */}
            <Card
              elevation={0}
              sx={{
                mt: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmojiEventsIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    {t('tournament.standings.title')}
                  </Typography>
                  {isLoggedIn && tournament.isTournamentAdmin && standings.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {tournamentIsPro ? t('tournament.standings.dragToReorder') : t('tournament.standings.proOnlyReorder')}
                    </Typography>
                  )}
                </Box>
                {loadingStandings ? (
                  <Typography color="text.secondary">{t('tournament.matches.loading')}</Typography>
                ) : standings.length === 0 && standingsByGroup.length === 0 ? (
                  <Typography color="text.secondary">{t('tournament.standings.empty')}</Typography>
                ) : (
                  <>
                    {/* General table (or single table when no groups) */}
                    {standingsByGroup.length > 0 && (
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                        {t('tournament.standings.generalTitle')}
                      </Typography>
                    )}
                    <DndContext
                      sensors={standingsSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleStandingsDragEnd}
                    >
                      <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 360 }}>
                          <TableHead>
                            <TableRow>
                              {isLoggedIn && tournament.isTournamentAdmin && tournamentIsPro && (
                                <TableCell sx={{ width: 36 }} />
                              )}
                              <TableCell sx={{ width: 40 }} align="center">{t('tournament.standings.pos')}</TableCell>
                              <TableCell sortDirection={standingsSortBy === 'team' ? standingsSortOrder : false}>
                                <TableSortLabel
                                  active={standingsSortBy === 'team'}
                                  direction={standingsSortBy === 'team' ? standingsSortOrder : 'asc'}
                                  onClick={() => handleStandingsSort('team')}
                                >
                                  {t('tournament.standings.team')}
                                </TableSortLabel>
                              </TableCell>
                              <TableCell align="center" sortDirection={standingsSortBy === 'played' ? standingsSortOrder : false}>
                                <TableSortLabel
                                  active={standingsSortBy === 'played'}
                                  direction={standingsSortBy === 'played' ? standingsSortOrder : 'desc'}
                                  onClick={() => handleStandingsSort('played')}
                                >
                                  {t('tournament.standings.played')}
                                </TableSortLabel>
                              </TableCell>
                              <TableCell align="center">{t('tournament.standings.won')}</TableCell>
                              <TableCell align="center">{t('tournament.standings.drawn')}</TableCell>
                              <TableCell align="center">{t('tournament.standings.lost')}</TableCell>
                              <TableCell align="center">{t('tournament.standings.goalsFor')}</TableCell>
                              <TableCell align="center">{t('tournament.standings.goalsAgainst')}</TableCell>
                              <TableCell align="center" sortDirection={standingsSortBy === 'goalDiff' ? standingsSortOrder : false}>
                                <TableSortLabel
                                  active={standingsSortBy === 'goalDiff'}
                                  direction={standingsSortBy === 'goalDiff' ? standingsSortOrder : 'desc'}
                                  onClick={() => handleStandingsSort('goalDiff')}
                                >
                                  {t('tournament.standings.goalDiff')}
                                </TableSortLabel>
                              </TableCell>
                              <TableCell align="center" sortDirection={standingsSortBy === 'points' ? standingsSortOrder : false}>
                                <TableSortLabel
                                  active={standingsSortBy === 'points'}
                                  direction={standingsSortBy === 'points' ? standingsSortOrder : 'desc'}
                                  onClick={() => handleStandingsSort('points')}
                                >
                                  {t('tournament.standings.points')}
                                </TableSortLabel>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <SortableContext
                              items={sortedStandings.map((r) => r.teamId)}
                              strategy={verticalListSortingStrategy}
                            >
                              {sortedStandings.map((row, idx) => (
                                <SortableStandingsRow
                                  key={row.teamId}
                                  row={row}
                                  index={idx}
                                  isAdmin={isLoggedIn && !!tournament.isTournamentAdmin}
                                  canReorder={isLoggedIn && !!tournament.isTournamentAdmin && tournamentIsPro}
                                  onTeamClick={(id) => {
                                    const row = standings.find((r) => r.teamId === id);
                                    navigate('/dashboard', {
                                      state: {
                                        section: 'tournaments',
                                        selectedTournamentSlugOrId: slugOrId,
                                        selectedTeamIdInTournament: id,
                                        selectedTeamName: row?.teamName,
                                      },
                                    });
                                  }}
                                  tournamentIsPro={tournamentIsPro}
                                  defaultTeamLogoUrl={defaultTeamLogoUrl}
                                  showGroupColumn={false}
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </DndContext>
                    {/* Per-group tables */}
                    {sortedStandingsByGroup.map(({ groupId, groupName, standings: groupStandings }) => {
                      const canReorderGroup = isLoggedIn && !!tournament.isTournamentAdmin && tournamentIsPro;
                      return (
                        <Box key={groupId} sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                            {groupName}
                          </Typography>
                          <DndContext
                            sensors={standingsSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleGroupStandingsDragEnd(groupId, e)}
                          >
                            <TableContainer sx={{ overflowX: 'auto' }}>
                              <Table size="small" sx={{ minWidth: 360 }}>
                                <TableHead>
                                  <TableRow>
                                    {canReorderGroup && (
                                      <TableCell sx={{ width: 36 }} />
                                    )}
                                    <TableCell sx={{ width: 40 }} align="center">{t('tournament.standings.pos')}</TableCell>
                                    <TableCell>{t('tournament.matches.group')}</TableCell>
                                    <TableCell sortDirection={standingsSortBy === 'team' ? standingsSortOrder : false}>
                                      <TableSortLabel
                                        active={standingsSortBy === 'team'}
                                        direction={standingsSortBy === 'team' ? standingsSortOrder : 'asc'}
                                        onClick={() => handleStandingsSort('team')}
                                      >
                                        {t('tournament.standings.team')}
                                      </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center" sortDirection={standingsSortBy === 'played' ? standingsSortOrder : false}>
                                      <TableSortLabel
                                        active={standingsSortBy === 'played'}
                                        direction={standingsSortBy === 'played' ? standingsSortOrder : 'desc'}
                                        onClick={() => handleStandingsSort('played')}
                                      >
                                        {t('tournament.standings.played')}
                                      </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center">{t('tournament.standings.won')}</TableCell>
                                    <TableCell align="center">{t('tournament.standings.drawn')}</TableCell>
                                    <TableCell align="center">{t('tournament.standings.lost')}</TableCell>
                                    <TableCell align="center">{t('tournament.standings.goalsFor')}</TableCell>
                                    <TableCell align="center">{t('tournament.standings.goalsAgainst')}</TableCell>
                                    <TableCell align="center" sortDirection={standingsSortBy === 'goalDiff' ? standingsSortOrder : false}>
                                      <TableSortLabel
                                        active={standingsSortBy === 'goalDiff'}
                                        direction={standingsSortBy === 'goalDiff' ? standingsSortOrder : 'desc'}
                                        onClick={() => handleStandingsSort('goalDiff')}
                                      >
                                        {t('tournament.standings.goalDiff')}
                                      </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center" sortDirection={standingsSortBy === 'points' ? standingsSortOrder : false}>
                                      <TableSortLabel
                                        active={standingsSortBy === 'points'}
                                        direction={standingsSortBy === 'points' ? standingsSortOrder : 'desc'}
                                        onClick={() => handleStandingsSort('points')}
                                      >
                                        {t('tournament.standings.points')}
                                      </TableSortLabel>
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  <SortableContext
                                    items={groupStandings.map((r) => r.teamId)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {groupStandings.map((row, idx) => (
                                      <SortableStandingsRow
                                        key={row.teamId}
                                        row={row}
                                        index={idx}
                                        isAdmin={isLoggedIn && !!tournament.isTournamentAdmin}
                                        canReorder={canReorderGroup}
                                        onTeamClick={(id) =>
                                          navigate('/dashboard', {
                                            state: {
                                              section: 'tournaments',
                                              selectedTournamentSlugOrId: slugOrId,
                                              selectedTeamIdInTournament: id,
                                              selectedTeamName: row.teamName,
                                            },
                                          })
                                        }
                                        tournamentIsPro={tournamentIsPro}
                                        defaultTeamLogoUrl={defaultTeamLogoUrl}
                                      />
                                    ))}
                                  </SortableContext>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </DndContext>
                        </Box>
                      );
                    })}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top scorers */}
            {(tournament.sport === 'soccer' || tournament.sport === 'futsal') && (
              <Card
                elevation={0}
                sx={{
                  mt: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <SportsSoccerIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      {t('tournament.topScorers.title')}
                    </Typography>
                  </Box>
                  {topScorers.length === 0 ? (
                    <Typography color="text.secondary">{t('tournament.topScorers.empty')}</Typography>
                  ) : (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                      <Table size="small" sx={{ minWidth: 280 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 40 }}>#</TableCell>
                            <TableCell sortDirection={topScorersSortBy === 'player' ? topScorersSortOrder : false}>
                              <TableSortLabel
                                active={topScorersSortBy === 'player'}
                                direction={topScorersSortBy === 'player' ? topScorersSortOrder : 'asc'}
                                onClick={() => handleTopScorersSort('player')}
                              >
                                {t('tournament.topScorers.player')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={topScorersSortBy === 'team' ? topScorersSortOrder : false}>
                              <TableSortLabel
                                active={topScorersSortBy === 'team'}
                                direction={topScorersSortBy === 'team' ? topScorersSortOrder : 'asc'}
                                onClick={() => handleTopScorersSort('team')}
                              >
                                {t('tournament.topScorers.team')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sortDirection={topScorersSortBy === 'goals' ? topScorersSortOrder : false}>
                              <TableSortLabel
                                active={topScorersSortBy === 'goals'}
                                direction={topScorersSortBy === 'goals' ? topScorersSortOrder : 'desc'}
                                onClick={() => handleTopScorersSort('goals')}
                              >
                                {t('tournament.topScorers.goals')}
                              </TableSortLabel>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedTopScorers.map((s, idx) => (
                            <TableRow key={`${s.playerName}-${s.teamName}-${idx}`}>
                              <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                              <TableCell>{s.playerName}</TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>{s.teamName}</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>{s.goals}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cards (yellow/red) per match */}
            {(tournament.sport === 'soccer' || tournament.sport === 'futsal') && (
              <Card
                elevation={0}
                sx={{
                  mt: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WarningIcon sx={{ color: 'warning.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      {t('tournament.cardsByMatch.title')}
                    </Typography>
                  </Box>
                  {cardsByMatch.length === 0 ? (
                    <Typography color="text.secondary">{t('tournament.cardsByMatch.empty')}</Typography>
                  ) : (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                      <Table size="small" sx={{ minWidth: 400 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }} sortDirection={cardsByMatchSortBy === 'date' ? cardsByMatchSortOrder : false}>
                              <TableSortLabel
                                active={cardsByMatchSortBy === 'date'}
                                direction={cardsByMatchSortBy === 'date' ? cardsByMatchSortOrder : 'asc'}
                                onClick={() => handleCardsByMatchSort('date')}
                              >
                                {t('tournament.cardsByMatch.date')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }} sortDirection={cardsByMatchSortBy === 'match' ? cardsByMatchSortOrder : false}>
                              <TableSortLabel
                                active={cardsByMatchSortBy === 'match'}
                                direction={cardsByMatchSortBy === 'match' ? cardsByMatchSortOrder : 'asc'}
                                onClick={() => handleCardsByMatchSort('match')}
                              >
                                {t('tournament.cardsByMatch.match')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('tournament.cardsByMatch.card')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} sortDirection={cardsByMatchSortBy === 'player' ? cardsByMatchSortOrder : false}>
                              <TableSortLabel
                                active={cardsByMatchSortBy === 'player'}
                                direction={cardsByMatchSortBy === 'player' ? cardsByMatchSortOrder : 'asc'}
                                onClick={() => handleCardsByMatchSort('player')}
                              >
                                {t('tournament.cardsByMatch.player')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }} sortDirection={cardsByMatchSortBy === 'minute' ? cardsByMatchSortOrder : false}>
                              <TableSortLabel
                                active={cardsByMatchSortBy === 'minute'}
                                direction={cardsByMatchSortBy === 'minute' ? cardsByMatchSortOrder : 'asc'}
                                onClick={() => handleCardsByMatchSort('minute')}
                              >
                                {t('tournament.matches.minute')}
                              </TableSortLabel>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedCardsByMatch.map((row, idx) => (
                            <TableRow key={`${row.matchId}-${row.type}-${row.playerName}-${idx}`}>
                              <TableCell sx={{ color: 'text.secondary' }}>{row.date}</TableCell>
                              <TableCell>{row.matchLabel}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.type === 'yellow_card' ? t('tournament.matches.stats.yellowCards') : t('tournament.matches.stats.redCards')}
                                  color={row.type === 'yellow_card' ? 'warning' : 'error'}
                                  sx={{ fontSize: '0.7rem', height: 22 }}
                                />
                              </TableCell>
                              <TableCell>{row.playerName}</TableCell>
                              <TableCell align="center">{row.minute ?? '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lista de jugadores */}
            <Card
              elevation={0}
              sx={{
                mt: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PeopleIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    {t('dashboard.playersSection')}
                  </Typography>
                </Box>
                {tournament?.categoryType === 'ages' && (tournament?.ageCategories?.length ?? 0) > 0 && (
                  <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
                    <InputLabel id="tournament-players-category-filter">{t('dashboard.playersFilterByCategory')}</InputLabel>
                    <Select
                      labelId="tournament-players-category-filter"
                      value={tournamentPlayersAgeCategoryFilter ?? ''}
                      label={t('dashboard.playersFilterByCategory')}
                      onChange={(e) => {
                        const v = e.target.value as string;
                        setTournamentPlayersAgeCategoryFilter(v === '' ? null : v);
                        setTournamentPlayersPage(1);
                      }}
                    >
                      <MenuItem value="">{t('dashboard.playersAllCategories')}</MenuItem>
                      {(tournament?.ageCategories ?? []).map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {loadingTournamentPlayers ? (
                  <Typography color="text.secondary">{t('app.myTournaments.loading')}</Typography>
                ) : tournamentPlayers.length === 0 ? (
                  <Typography color="text.secondary">{t('dashboard.playersEmpty')}</Typography>
                ) : (
                  <>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.playersPhoto')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} sortDirection={tournamentPlayersSortBy === 'name' ? tournamentPlayersSortOrder : false}>
                              <TableSortLabel
                                active={tournamentPlayersSortBy === 'name'}
                                direction={tournamentPlayersSortBy === 'name' ? tournamentPlayersSortOrder : 'asc'}
                                onClick={() => handleTournamentPlayersSort('name')}
                              >
                                {t('dashboard.playersName')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.playersIdNumber')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} sortDirection={tournamentPlayersSortBy === 'birthDate' ? tournamentPlayersSortOrder : false}>
                              <TableSortLabel
                                active={tournamentPlayersSortBy === 'birthDate'}
                                direction={tournamentPlayersSortBy === 'birthDate' ? tournamentPlayersSortOrder : 'asc'}
                                onClick={() => handleTournamentPlayersSort('birthDate')}
                              >
                                {t('dashboard.playersBirthDate')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('team.detail.age')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} sortDirection={tournamentPlayersSortBy === 'team' ? tournamentPlayersSortOrder : false}>
                              <TableSortLabel
                                active={tournamentPlayersSortBy === 'team'}
                                direction={tournamentPlayersSortBy === 'team' ? tournamentPlayersSortOrder : 'asc'}
                                onClick={() => handleTournamentPlayersSort('team')}
                              >
                                {t('dashboard.playersTeam')}
                              </TableSortLabel>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedTournamentPlayers.map((row) => {
                            const age = getAgeFromBirthDate(row.birthDate, row.birthYear);
                            return (
                              <TableRow key={row.id} hover>
                                <TableCell>
                                  <Avatar
                                    src={row.photoUrl ?? DEFAULT_PERSON_IMAGE_URL}
                                    sx={{ width: 40, height: 40, bgcolor: 'action.hover' }}
                                  >
                                    <PeopleIcon sx={{ fontSize: 24 }} />
                                  </Avatar>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    size="small"
                                    sx={{ textTransform: 'none', p: 0, minWidth: 0, fontWeight: 600, textAlign: 'left' }}
                                    onClick={() =>
                                      navigate(`/teams/${row.teamId}/players/${row.id}`, {
                                        state: { from: 'team' as const },
                                      })
                                    }
                                  >
                                    {row.name}
                                  </Button>
                                </TableCell>
                                <TableCell>{row.idDocumentNumber ?? '—'}</TableCell>
                                <TableCell>{formatPlayerBirthDisplay(row.birthDate, row.birthYear)}</TableCell>
                                <TableCell>{age != null ? t('team.detail.yearsOld', { count: age }) : '—'}</TableCell>
                                <TableCell>{row.teamName}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      component="div"
                      count={tournamentPlayersTotal}
                      page={tournamentPlayersPage - 1}
                      onPageChange={(_, newPage) => setTournamentPlayersPage(newPage + 1)}
                      rowsPerPage={TOURNAMENT_PLAYERS_PAGE_SIZE}
                      rowsPerPageOptions={[TOURNAMENT_PLAYERS_PAGE_SIZE]}
                      labelDisplayedRows={({ from, to, count }) =>
                        `${from}–${to} ${t('dashboard.playersPaginationOf')} ${count}`}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Player change requests (tournament admin only) */}
            {isLoggedIn && tournament.isTournamentAdmin && (
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    {t('playerChangeRequests.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('playerChangeRequests.help')}
                  </Typography>
                  {loadingPlayerRequests ? (
                    <Typography color="text.secondary">{t('app.myTournaments.loading')}</Typography>
                  ) : playerChangeRequests.length === 0 ? (
                    <Typography color="text.secondary">{t('playerChangeRequests.empty')}</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sortDirection={playerRequestsSortBy === 'requestDate' ? playerRequestsSortOrder : false}>
                              <TableSortLabel
                                active={playerRequestsSortBy === 'requestDate'}
                                direction={playerRequestsSortBy === 'requestDate' ? playerRequestsSortOrder : 'desc'}
                                onClick={() => handlePlayerRequestsSort('requestDate')}
                              >
                                {t('playerChangeRequests.requestDate')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={playerRequestsSortBy === 'team' ? playerRequestsSortOrder : false}>
                              <TableSortLabel
                                active={playerRequestsSortBy === 'team'}
                                direction={playerRequestsSortBy === 'team' ? playerRequestsSortOrder : 'asc'}
                                onClick={() => handlePlayerRequestsSort('team')}
                              >
                                {t('playerChangeRequests.team')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={playerRequestsSortBy === 'requestType' ? playerRequestsSortOrder : false}>
                              <TableSortLabel
                                active={playerRequestsSortBy === 'requestType'}
                                direction={playerRequestsSortBy === 'requestType' ? playerRequestsSortOrder : 'asc'}
                                onClick={() => handlePlayerRequestsSort('requestType')}
                              >
                                {t('playerChangeRequests.requestType')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={playerRequestsSortBy === 'requestedBy' ? playerRequestsSortOrder : false}>
                              <TableSortLabel
                                active={playerRequestsSortBy === 'requestedBy'}
                                direction={playerRequestsSortBy === 'requestedBy' ? playerRequestsSortOrder : 'asc'}
                                onClick={() => handlePlayerRequestsSort('requestedBy')}
                              >
                                {t('playerChangeRequests.requestedBy')}
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedPlayerChangeRequests.map((req) => {
                            const ageCategories = tournament?.ageCategories ?? [];
                            const getCategoryName = (id: string | null | undefined) =>
                              id ? ageCategories.find((c) => c.id === id)?.name ?? id : null;
                            const payloadName =
                              req.payload?.name ||
                              [req.payload?.firstName, req.payload?.lastName].filter(Boolean).join(' ') ||
                              null;
                            const currName = req.player
                              ? req.player.name ||
                                [req.player.firstName, req.player.lastName].filter(Boolean).join(' ') ||
                                '—'
                              : '—';
                            type PlayerLike = {
                              name?: string;
                              firstName?: string | null;
                              lastName?: string | null;
                              birthYear?: number;
                              birthDate?: string | null;
                              tournamentAgeCategoryId?: string | null;
                              idDocumentType?: string | null;
                              idDocumentNumber?: string | null;
                              guardianName?: string | null;
                              guardianRelation?: string | null;
                              guardianPhone?: string | null;
                              guardianEmail?: string | null;
                            };
                            const curr = (req.player ?? {}) as PlayerLike;
                            const p = req.payload ?? {};
                            const changeLines: Array<{ label: string; current: string; requested: string } | { label: string; value: string }> = [];
                            if (req.type === 'add') {
                              if (payloadName) changeLines.push({ label: t('playerChangeRequests.fieldName'), value: payloadName });
                              if (p.birthYear != null) changeLines.push({ label: t('playerChangeRequests.fieldBirthYear'), value: String(p.birthYear) });
                              if (p.birthDate) changeLines.push({ label: t('playerChangeRequests.fieldBirthDate'), value: formatBirthDateMMDDYYYY(p.birthDate) || p.birthDate });
                              const catName = getCategoryName(p.tournamentAgeCategoryId ?? undefined);
                              if (catName) changeLines.push({ label: t('playerChangeRequests.fieldCategory'), value: catName });
                              if (p.idDocumentType != null) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentType'), value: p.idDocumentType || '—' });
                              if (p.idDocumentNumber != null) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentNumber'), value: p.idDocumentNumber || '—' });
                              if (p.guardianName != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianName'), value: p.guardianName || '—' });
                              if (p.guardianRelation != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianRelation'), value: p.guardianRelation || '—' });
                              if (p.guardianPhone != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianPhone'), value: p.guardianPhone || '—' });
                              if (p.guardianEmail != null) changeLines.push({ label: t('playerChangeRequests.fieldGuardianEmail'), value: p.guardianEmail || '—' });
                            } else if (req.type === 'edit' && req.player) {
                              const fmt = (v: string | number | null | undefined) => (v === undefined || v === null || v === '' ? '—' : String(v));
                              const requestedName = p.name ?? ([p.firstName, p.lastName].filter(Boolean).join(' ') || undefined);
                              if ('name' in p || 'firstName' in p || 'lastName' in p) {
                                changeLines.push({ label: t('playerChangeRequests.fieldName'), current: currName, requested: fmt(requestedName) });
                              }
                              if ('birthYear' in p) changeLines.push({ label: t('playerChangeRequests.fieldBirthYear'), current: fmt(curr.birthYear), requested: fmt(p.birthYear) });
                              if ('birthDate' in p) changeLines.push({ label: t('playerChangeRequests.fieldBirthDate'), current: formatBirthDateMMDDYYYY(curr.birthDate) || fmt(curr.birthDate), requested: formatBirthDateMMDDYYYY(p.birthDate) || fmt(p.birthDate) });
                              if ('tournamentAgeCategoryId' in p) {
                                const currCat = getCategoryName(curr.tournamentAgeCategoryId) ?? '—';
                                const reqCat = getCategoryName(p.tournamentAgeCategoryId ?? undefined) ?? '—';
                                changeLines.push({ label: t('playerChangeRequests.fieldCategory'), current: currCat, requested: reqCat });
                              }
                              if ('idDocumentType' in p) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentType'), current: fmt(curr.idDocumentType), requested: fmt(p.idDocumentType) });
                              if ('idDocumentNumber' in p) changeLines.push({ label: t('playerChangeRequests.fieldIdDocumentNumber'), current: fmt(curr.idDocumentNumber), requested: fmt(p.idDocumentNumber) });
                              if ('guardianName' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianName'), current: fmt(curr.guardianName), requested: fmt(p.guardianName) });
                              if ('guardianRelation' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianRelation'), current: fmt(curr.guardianRelation), requested: fmt(p.guardianRelation) });
                              if ('guardianPhone' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianPhone'), current: fmt(curr.guardianPhone), requested: fmt(p.guardianPhone) });
                              if ('guardianEmail' in p) changeLines.push({ label: t('playerChangeRequests.fieldGuardianEmail'), current: fmt(curr.guardianEmail), requested: fmt(p.guardianEmail) });
                            } else if (req.type === 'delete') {
                              if (req.player) changeLines.push({ label: t('playerChangeRequests.fieldName'), value: req.player.name });
                            }
                            const requestDateStr = req.createdAt
                              ? new Date(req.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                              : '—';
                            return (
                            <TableRow key={req.id}>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{requestDateStr}</TableCell>
                              <TableCell>{req.team?.name ?? '-'}</TableCell>
                              <TableCell>
                                {req.type === 'add'
                                  ? t('playerChangeRequests.typeAdd')
                                  : req.type === 'edit'
                                    ? t('playerChangeRequests.typeEdit')
                                    : t('playerChangeRequests.typeDelete')}
                                {req.type === 'add' && payloadName ? `: ${payloadName}` : ''}
                                {req.type === 'edit' && req.player ? ` (${req.player.name})` : ''}
                                {req.type === 'delete' && req.player ? `: ${req.player.name}` : ''}
                              </TableCell>
                              <TableCell>{req.requestedByUser?.name ?? '-'}</TableCell>
                              <TableCell align="right" sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      setViewChangesRequestDetail(req);
                                      setViewChangesRequestId(req.id);
                                    }}
                                  >
                                    {t('playerChangeRequests.viewChanges')}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    disabled={playerRequestActionId === req.id}
                                    onClick={() => handleApprovePlayerRequest(req.id)}
                                  >
                                    {t('playerChangeRequests.approve')}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    disabled={playerRequestActionId === req.id}
                                    onClick={() => handleRejectPlayerRequest(req.id)}
                                  >
                                    {t('playerChangeRequests.reject')}
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Generate schedule dialog */}
            <Dialog
              open={generateOpen}
              onClose={() => setGenerateOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>{t('tournament.matches.generate')}</DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                {generateError && (
                  <Typography
                    variant="body2"
                    color="error"
                    sx={{ mb: 2 }}
                  >
                    {generateError}
                  </Typography>
                )}
                {matches.length > 0 && !canDeleteAndRegenerateSchedule && (
                  <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                    {t('tournament.matches.cannotDeleteRegenerateWithScores')}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('tournament.matches.generateDesc')}
                </Typography>
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">
                    {t('tournament.matches.mode')}
                  </FormLabel>
                  <RadioGroup
                    value={generateMode}
                    onChange={(e) =>
                      setGenerateMode(e.target.value as 'all' | 'groups')
                    }
                  >
                    <FormControlLabel
                      value="all"
                      control={<Radio />}
                      label={t('tournament.matches.modeAll')}
                    />
                    <FormControlLabel
                      value="groups"
                      control={<Radio />}
                      label={t('tournament.matches.modeGroups')}
                    />
                  </RadioGroup>
                </FormControl>
                {generateMode === 'groups' && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>{t('tournament.matches.numGroups')}</InputLabel>
                    <Select
                      value={generateNumGroups}
                      label={t('tournament.matches.numGroups')}
                      onChange={(e) =>
                        setGenerateNumGroups(Number(e.target.value))
                      }
                    >
                      {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <MenuItem key={n} value={n}>
                          {n} {t('tournament.matches.groups')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <FormControl component="fieldset">
                  <FormLabel component="legend">
                    {t('tournament.matches.rounds')}
                  </FormLabel>
                  <RadioGroup
                    value={generateRounds}
                    onChange={(e) =>
                      setGenerateRounds(
                        Number(e.target.value) as 1 | 2
                      )
                    }
                  >
                    <FormControlLabel
                      value={1}
                      control={<Radio />}
                      label={t('tournament.matches.round1')}
                    />
                    <FormControlLabel
                      value={2}
                      control={<Radio />}
                      label={t('tournament.matches.round2')}
                    />
                  </RadioGroup>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setGenerateOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (matches.length > 0 && !canDeleteAndRegenerateSchedule) return;
                    setGenerateSubmitting(true);
                    setGenerateError('');
                    try {
                      if (matches.length > 0) {
                        await deleteMatches(tournament.id);
                      }
                      const data = await generateSchedule(tournament.id, {
                        rounds: generateRounds,
                        mode: generateMode,
                        ...(generateMode === 'groups' && {
                          numGroups: generateNumGroups,
                        }),
                      });
                      setMatches(data);
                      setGenerateOpen(false);
                    } catch (err) {
                      setGenerateError(
                        err instanceof Error
                          ? err.message
                          : t('team.add.error')
                      );
                    } finally {
                      setGenerateSubmitting(false);
                    }
                  }}
                  disabled={generateSubmitting || (matches.length > 0 && !canDeleteAndRegenerateSchedule)}
                >
                  {generateSubmitting
                    ? t('team.add.submitting')
                    : matches.length > 0
                      ? t('tournament.matches.deleteAndRegenerate')
                      : t('tournament.matches.generate')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Edit match date dialog */}
            <Dialog
              open={editMatchOpen}
              onClose={() => setEditMatchOpen(false)}
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle>{t('tournament.matches.editDate')}</DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                {editMatch && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {editMatch.homeTeam?.name} vs {editMatch.awayTeam?.name}
                  </Typography>
                )}
                <TextField
                  label={t('tournament.matches.scheduledAt')}
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => setEditScheduledAt('')}
                >
                  {t('tournament.matches.clearDate')}
                </Button>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditMatchOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!editMatch) return;
                    setEditSubmitting(true);
                    try {
                      const updated = await updateMatch(tournament.id, editMatch.id, {
                        scheduledAt: editScheduledAt
                          ? new Date(editScheduledAt).toISOString()
                          : null,
                      });
                      setMatches((prev) =>
                        prev.map((m) =>
                          m.id === updated.id ? updated : m
                        )
                      );
                      setEditMatchOpen(false);
                    } finally {
                      setEditSubmitting(false);
                    }
                  }}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? t('team.add.submitting') : t('tournament.matches.save')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Revert suspend match confirm */}
            <Dialog
              open={confirmRevertSuspendOpen}
              onClose={() => {
                setConfirmRevertSuspendOpen(false);
                setRevertSuspendTarget(null);
              }}
            >
              <DialogTitle>{t('tournament.matches.revertSuspend')}</DialogTitle>
              <DialogContent>
                {revertSuspendTarget && (
                  <Typography>
                    {t('tournament.matches.revertSuspendConfirm', {
                      match: `${revertSuspendTarget.homeTeam?.name ?? '-'} vs ${revertSuspendTarget.awayTeam?.name ?? '-'}`,
                    })}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setConfirmRevertSuspendOpen(false);
                    setRevertSuspendTarget(null);
                  }}
                >
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={async () => {
                    if (!revertSuspendTarget) return;
                    setRevertSuspendSubmitting(true);
                    try {
                      const updated = await updateMatch(tournament.id, revertSuspendTarget.id, {
                        status: 'scheduled',
                      });
                      setMatches((prev) =>
                        prev.map((m) => (m.id === updated.id ? updated : m))
                      );
                      setConfirmRevertSuspendOpen(false);
                      setRevertSuspendTarget(null);
                    } finally {
                      setRevertSuspendSubmitting(false);
                    }
                  }}
                  disabled={revertSuspendSubmitting}
                >
                  {revertSuspendSubmitting ? t('team.add.submitting') : t('tournament.matches.revertSuspend')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Suspend match confirm */}
            <Dialog
              open={confirmSuspendMatchOpen}
              onClose={() => {
                setConfirmSuspendMatchOpen(false);
                setSuspendMatchTarget(null);
              }}
            >
              <DialogTitle>{t('tournament.matches.suspendMatch')}</DialogTitle>
              <DialogContent>
                {suspendMatchTarget && (
                  <Typography>
                    {t('tournament.matches.suspendMatchConfirm', {
                      match: `${suspendMatchTarget.homeTeam?.name ?? '-'} vs ${suspendMatchTarget.awayTeam?.name ?? '-'}`,
                    })}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setConfirmSuspendMatchOpen(false);
                    setSuspendMatchTarget(null);
                  }}
                >
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  color="warning"
                  variant="contained"
                  onClick={async () => {
                    if (!suspendMatchTarget) return;
                    setSuspendMatchSubmitting(true);
                    try {
                      const updated = await updateMatch(tournament.id, suspendMatchTarget.id, {
                        status: 'suspended',
                      });
                      setMatches((prev) =>
                        prev.map((m) => (m.id === updated.id ? updated : m))
                      );
                      setConfirmSuspendMatchOpen(false);
                      setSuspendMatchTarget(null);
                    } finally {
                      setSuspendMatchSubmitting(false);
                    }
                  }}
                  disabled={suspendMatchSubmitting}
                >
                  {suspendMatchSubmitting ? t('team.add.submitting') : t('tournament.matches.suspendMatch')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Delete match confirm */}
            <Dialog
              open={confirmDeleteMatchOpen}
              onClose={() => {
                setConfirmDeleteMatchOpen(false);
                setDeleteMatchTarget(null);
              }}
            >
              <DialogTitle>{t('tournament.matches.deleteMatch')}</DialogTitle>
              <DialogContent>
                {deleteMatchTarget && (
                  <Typography>
                    {t('tournament.matches.deleteMatchConfirm', {
                      match: `${deleteMatchTarget.homeTeam?.name ?? '-'} vs ${deleteMatchTarget.awayTeam?.name ?? '-'}`,
                    })}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setConfirmDeleteMatchOpen(false);
                    setDeleteMatchTarget(null);
                  }}
                >
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={async () => {
                    if (!deleteMatchTarget) return;
                    setDeleteMatchSubmitting(true);
                    try {
                      await deleteMatch(tournament.id, deleteMatchTarget.id);
                      setMatches((prev) => prev.filter((m) => m.id !== deleteMatchTarget.id));
                      setConfirmDeleteMatchOpen(false);
                      setDeleteMatchTarget(null);
                    } finally {
                      setDeleteMatchSubmitting(false);
                    }
                  }}
                  disabled={deleteMatchSubmitting}
                >
                  {deleteMatchSubmitting ? t('team.add.submitting') : t('tournament.matches.deleteMatch')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Add match dialog */}
            <Dialog
              open={addMatchOpen}
              onClose={() => setAddMatchOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>{t('tournament.matches.addMatch')}</DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                {addMatchError && (
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {addMatchError}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('tournament.matches.addMatchDesc')}
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>{t('tournament.matches.home')}</InputLabel>
                  <Select
                    value={addMatchForm.homeTeamId}
                    label={t('tournament.matches.home')}
                    onChange={(e) =>
                      setAddMatchForm((f) => ({ ...f, homeTeamId: e.target.value }))
                    }
                  >
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>{t('tournament.matches.away')}</InputLabel>
                  <Select
                    value={addMatchForm.awayTeamId}
                    label={t('tournament.matches.away')}
                    onChange={(e) =>
                      setAddMatchForm((f) => ({ ...f, awayTeamId: e.target.value }))
                    }
                  >
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">{t('tournament.matches.addMatchReason')}</FormLabel>
                  <RadioGroup
                    value={addMatchForm.reason}
                    onChange={(e) =>
                      setAddMatchForm((f) => ({
                        ...f,
                        reason: e.target.value as 'rescheduled' | 'administrative',
                        suspendedMatchId: e.target.value === 'administrative' ? '' : f.suspendedMatchId,
                      }))
                    }
                  >
                    <FormControlLabel
                      value="administrative"
                      control={<Radio />}
                      label={t('tournament.matches.reasonAdministrative')}
                    />
                    <FormControlLabel
                      value="rescheduled"
                      control={<Radio />}
                      label={t('tournament.matches.reasonRescheduled')}
                    />
                  </RadioGroup>
                </FormControl>
                {addMatchForm.reason === 'rescheduled' && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>{t('tournament.matches.suspendedMatch')}</InputLabel>
                    <Select
                      value={addMatchForm.suspendedMatchId}
                      label={t('tournament.matches.suspendedMatch')}
                      onChange={(e) =>
                        setAddMatchForm((f) => ({ ...f, suspendedMatchId: e.target.value }))
                      }
                    >
                      <MenuItem value="">{t('tournament.create.categoryType.none')}</MenuItem>
                      {matches
                        .filter((m) => m.status === 'suspended')
                        .map((m) => (
                          <MenuItem key={m.id} value={m.id}>
                            {m.homeTeam?.name ?? '-'} vs {m.awayTeam?.name ?? '-'}
                            {m.scheduledAt ? ` (${new Date(m.scheduledAt).toLocaleDateString()})` : ''}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
                <TextField
                  label={t('tournament.matches.scheduledAt')}
                  type="datetime-local"
                  value={addMatchForm.scheduledAt}
                  onChange={(e) =>
                    setAddMatchForm((f) => ({ ...f, scheduledAt: e.target.value }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAddMatchOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!addMatchForm.homeTeamId || !addMatchForm.awayTeamId) return;
                    if (addMatchForm.homeTeamId === addMatchForm.awayTeamId) {
                      setAddMatchError(t('tournament.matches.teamsMustDiffer'));
                      return;
                    }
                    if (
                      addMatchForm.reason === 'rescheduled' &&
                      !addMatchForm.suspendedMatchId
                    ) {
                      setAddMatchError(t('tournament.matches.suspendedMatchRequired'));
                      return;
                    }
                    setAddMatchSubmitting(true);
                    setAddMatchError('');
                    try {
                      const created = await createMatch(tournament.id, {
                        homeTeamId: addMatchForm.homeTeamId,
                        awayTeamId: addMatchForm.awayTeamId,
                        suspendedMatchId:
                          addMatchForm.reason === 'rescheduled' && addMatchForm.suspendedMatchId
                            ? addMatchForm.suspendedMatchId
                            : undefined,
                        scheduledAt: addMatchForm.scheduledAt
                          ? new Date(addMatchForm.scheduledAt).toISOString()
                          : undefined,
                      });
                      setMatches((prev) =>
                        [...prev, created].sort(
                          (a, b) =>
                            a.round - b.round ||
                            (a.createdAt < b.createdAt ? -1 : 1)
                        )
                      );
                      setAddMatchOpen(false);
                    } catch (err) {
                      setAddMatchError(
                        err instanceof Error ? err.message : t('team.add.error')
                      );
                    } finally {
                      setAddMatchSubmitting(false);
                    }
                  }}
                  disabled={
                    addMatchSubmitting ||
                    !addMatchForm.homeTeamId ||
                    !addMatchForm.awayTeamId ||
                    (addMatchForm.reason === 'rescheduled' && !addMatchForm.suspendedMatchId)
                  }
                >
                  {addMatchSubmitting ? t('team.add.submitting') : t('tournament.matches.save')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Edit result dialog */}
            <Dialog
              open={editResultOpen}
              onClose={() => { setEditResultOpen(false); setEditResultValidationError(''); }}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  m: { xs: 1, sm: 2 },
                  maxHeight: { xs: 'calc(100vh - 16px)', sm: 'calc(100vh - 32px)' },
                },
              }}
            >
              <DialogTitle>{t('tournament.matches.editResult')}</DialogTitle>
              <DialogContent sx={{ pt: 1, px: { xs: 2, sm: 3 }, pb: 2, overflowY: 'auto' }}>
                {editResultValidationError && (
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {editResultValidationError}
                  </Typography>
                )}
                {editResultMatch && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {editResultMatch.homeTeam?.name} vs {editResultMatch.awayTeam?.name}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    label={t('tournament.matches.homeScore')}
                    type="number"
                    value={editResultHome}
                    onChange={(e) => setEditResultHome(e.target.value)}
                    inputProps={{ min: 0 }}
                    sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: 0, sm: 100 } }}
                  />
                  <Typography sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'center', sm: 'left' } }}>–</Typography>
                  <TextField
                    label={t('tournament.matches.awayScore')}
                    type="number"
                    value={editResultAway}
                    onChange={(e) => setEditResultAway(e.target.value)}
                    inputProps={{ min: 0 }}
                    sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: 0, sm: 100 } }}
                  />
                </Box>
                {getStatisticsForSport(tournament.sport).map((field) => (
                  <Box key={field.key} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 2 }}>
                    <TextField
                      label={`${t(`tournament.matches.${field.labelKey}`)} (${t('tournament.matches.home')})`}
                      type="number"
                      value={editResultStats[field.key]?.home ?? ''}
                      onChange={(e) =>
                        setEditResultStats((prev) => ({
                          ...prev,
                          [field.key]: { ...prev[field.key], home: e.target.value },
                        }))
                      }
                      inputProps={{ min: 0 }}
                      sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: 0, sm: 100 } }}
                    />
                    <Typography sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'center', sm: 'left' } }}>–</Typography>
                    <TextField
                      label={`${t(`tournament.matches.${field.labelKey}`)} (${t('tournament.matches.away')})`}
                      type="number"
                      value={editResultStats[field.key]?.away ?? ''}
                      onChange={(e) =>
                        setEditResultStats((prev) => ({
                          ...prev,
                          [field.key]: { ...prev[field.key], away: e.target.value },
                        }))
                      }
                      inputProps={{ min: 0 }}
                      sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: 0, sm: 100 } }}
                    />
                  </Box>
                ))}

                {/* Goal scorers */}
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                  {t('tournament.matches.goalScorers')}
                </Typography>
                {editResultMatchEvents
                  .map((evt, realIdx) => (evt.type === 'goal' ? { evt, realIdx } : null))
                  .filter((x): x is { evt: MatchEvent; realIdx: number } => x != null)
                  .map(({ evt, realIdx }) => (
                  <Box key={`goal-${realIdx}-${evt.teamSide}-${evt.playerId ?? ''}`} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                    <Select
                      size="small"
                      value={evt.teamSide}
                      onChange={(e) => {
                        const next = [...editResultMatchEvents];
                        next[realIdx] = { ...next[realIdx], teamSide: e.target.value as 'home' | 'away' };
                        setEditResultMatchEvents(next);
                      }}
                      sx={{ minWidth: { xs: 120, sm: 100 }, flex: { xs: '1 1 auto', sm: 'none' } }}
                    >
                      <MenuItem value="home">{editResultMatch?.homeTeam?.name ?? t('tournament.matches.home')}</MenuItem>
                      <MenuItem value="away">{editResultMatch?.awayTeam?.name ?? t('tournament.matches.away')}</MenuItem>
                    </Select>
                    <Select
                      size="small"
                      value={evt.playerId ?? ''}
                      displayEmpty
                      onChange={(e) => {
                        const pid = e.target.value as string;
                        const players = evt.teamSide === 'home' ? editResultHomePlayers : editResultAwayPlayers;
                        const p = players.find((x) => x.id === pid);
                        const next = [...editResultMatchEvents];
                        next[realIdx] = { ...next[realIdx], playerId: pid || undefined, playerName: p?.name };
                        setEditResultMatchEvents(next);
                      }}
                      sx={{ minWidth: { xs: 140, sm: 140 }, flex: { xs: '1 1 140px', sm: 'none' } }}
                      renderValue={(v) => {
                        const players = evt.teamSide === 'home' ? editResultHomePlayers : editResultAwayPlayers;
                        return players.find((x) => x.id === v)?.name ?? t('tournament.matches.selectPlayer');
                      }}
                    >
                      <MenuItem value="">{t('tournament.matches.selectPlayer')}</MenuItem>
                      {(evt.teamSide === 'home' ? editResultHomePlayers : editResultAwayPlayers).map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                    <TextField
                      size="small"
                      label={t('tournament.matches.goalsCount')}
                      type="number"
                      value={evt.type === 'goal' ? (evt.goals ?? 1) : ''}
                      onChange={(e) => {
                        const next = [...editResultMatchEvents];
                        const v = e.target.value ? Math.max(1, parseInt(e.target.value, 10) || 1) : 1;
                        next[realIdx] = { ...next[realIdx], goals: v };
                        setEditResultMatchEvents(next);
                      }}
                      inputProps={{ min: 1 }}
                      sx={{ width: { xs: 72, sm: 72 }, minWidth: 64 }}
                    />
                    <TextField
                      size="small"
                      placeholder={t('tournament.matches.minute')}
                      type="number"
                      value={evt.minute ?? ''}
                      onChange={(e) => {
                        const next = [...editResultMatchEvents];
                        next[realIdx] = { ...next[realIdx], minute: e.target.value ? parseInt(e.target.value, 10) : undefined };
                        setEditResultMatchEvents(next);
                      }}
                      inputProps={{ min: 0 }}
                      sx={{ width: { xs: 70, sm: 70 }, minWidth: 60 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={!!evt.ownGoal}
                          onChange={(e) => {
                            const next = [...editResultMatchEvents];
                            next[realIdx] = { ...next[realIdx], ownGoal: e.target.checked };
                            setEditResultMatchEvents(next);
                          }}
                        />
                      }
                      label={t('tournament.matches.ownGoal')}
                      sx={{ flex: { xs: '1 1 100%', sm: 'none' } }}
                    />
                    <IconButton size="small" onClick={() => setEditResultMatchEvents((prev) => prev.filter((_, i) => i !== realIdx))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => setEditResultMatchEvents((prev) => [...prev, { type: 'goal', teamSide: 'home', goals: 1 }])}>
                  {t('tournament.matches.addGoal')}
                </Button>

                {/* Cards with player */}
                {(tournament.sport === 'soccer' || tournament.sport === 'futsal') && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                      {t('tournament.matches.stats.yellowCards')} / {t('tournament.matches.stats.redCards')} – {t('tournament.matches.cardRecipient')}
                    </Typography>
                    {editResultMatchEvents
                      .map((evt, realIdx) => (evt.type === 'yellow_card' || evt.type === 'red_card' ? { evt, realIdx } : null))
                      .filter((x): x is { evt: MatchEvent; realIdx: number } => x != null)
                      .map(({ evt, realIdx }) => (
                      <Box key={`card-${realIdx}-${evt.type}-${evt.teamSide}-${evt.playerId ?? ''}`} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                        <Select
                          size="small"
                          value={evt.type}
                          onChange={(e) => {
                            const next = [...editResultMatchEvents];
                            next[realIdx] = { ...next[realIdx], type: e.target.value as 'yellow_card' | 'red_card' };
                            setEditResultMatchEvents(next);
                          }}
                          sx={{ minWidth: { xs: 90, sm: 90 }, flex: { xs: '1 1 auto', sm: 'none' } }}
                        >
                          <MenuItem value="yellow_card">{t('tournament.matches.stats.yellowCards')}</MenuItem>
                          <MenuItem value="red_card">{t('tournament.matches.stats.redCards')}</MenuItem>
                        </Select>
                        <Select
                          size="small"
                          value={evt.teamSide}
                          onChange={(e) => {
                            const next = [...editResultMatchEvents];
                            next[realIdx] = { ...next[realIdx], teamSide: e.target.value as 'home' | 'away' };
                            setEditResultMatchEvents(next);
                          }}
                          sx={{ minWidth: { xs: 100, sm: 100 }, flex: { xs: '1 1 auto', sm: 'none' } }}
                        >
                          <MenuItem value="home">{editResultMatch?.homeTeam?.name ?? t('tournament.matches.home')}</MenuItem>
                          <MenuItem value="away">{editResultMatch?.awayTeam?.name ?? t('tournament.matches.away')}</MenuItem>
                        </Select>
                        <Select
                          size="small"
                          value={evt.playerId ?? ''}
                          displayEmpty
                          onChange={(e) => {
                            const pid = e.target.value as string;
                            const players = evt.teamSide === 'home' ? editResultHomePlayers : editResultAwayPlayers;
                            const p = players.find((x) => x.id === pid);
                            const next = [...editResultMatchEvents];
                            next[realIdx] = { ...next[realIdx], playerId: pid || undefined, playerName: p?.name };
                            setEditResultMatchEvents(next);
                          }}
                          sx={{ minWidth: { xs: 140, sm: 140 }, flex: { xs: '1 1 140px', sm: 'none' } }}
                          renderValue={(v) => {
                            const players = evt.teamSide === 'home' ? editResultHomePlayers : editResultAwayPlayers;
                            return players.find((x) => x.id === v)?.name ?? t('tournament.matches.selectPlayer');
                          }}
                        >
                          <MenuItem value="">{t('tournament.matches.selectPlayer')}</MenuItem>
                          {(evt.teamSide === 'home' ? editResultHomePlayers : editResultAwayPlayers).map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                          ))}
                        </Select>
                        <IconButton size="small" onClick={() => setEditResultMatchEvents((prev) => prev.filter((_, i) => i !== realIdx))}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setEditResultMatchEvents((prev) => [...prev, { type: 'yellow_card', teamSide: 'home' }])}>
                      {t('tournament.matches.addCard')}
                    </Button>
                  </>
                )}

                {/* PRO: Extra points and penalties */}
                {tournamentIsPro && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                      {t('tournament.matches.proExtras')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField
                        label={`${t('tournament.matches.extraPoints')} (${t('tournament.matches.home')})`}
                        type="number"
                        value={editResultExtraPoints.home}
                        onChange={(e) => setEditResultExtraPoints((p) => ({ ...p, home: e.target.value }))}
                        inputProps={{ min: 0 }}
                        size="small"
                        sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: 0, sm: 120 } }}
                      />
                      <TextField
                        label={`${t('tournament.matches.extraPoints')} (${t('tournament.matches.away')})`}
                        type="number"
                        value={editResultExtraPoints.away}
                        onChange={(e) => setEditResultExtraPoints((p) => ({ ...p, away: e.target.value }))}
                        inputProps={{ min: 0 }}
                        size="small"
                        sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: 0, sm: 120 } }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {t('tournament.matches.penalties')}
                    </Typography>
                    {editResultPenalties.map((p, idx) => (
                      <Box key={`penalty-${idx}-${p.type}-${p.targetId ?? p.targetName ?? ''}`} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                        <Select
                          size="small"
                          value={p.type}
                          onChange={(e) => {
                            const next = [...editResultPenalties];
                            next[idx] = { ...next[idx], type: e.target.value as 'player' | 'team' | 'staff' };
                            setEditResultPenalties(next);
                          }}
                          sx={{ minWidth: { xs: 120, sm: 120 }, flex: { xs: '1 1 auto', sm: 'none' } }}
                        >
                          <MenuItem value="player">{t('tournament.matches.penaltyPlayer')}</MenuItem>
                          <MenuItem value="team">{t('tournament.matches.penaltyTeam')}</MenuItem>
                          <MenuItem value="staff">{t('tournament.matches.penaltyStaff')}</MenuItem>
                        </Select>
                        {p.type === 'player' && (
                          <Select
                            size="small"
                            value={p.targetId ?? ''}
                            displayEmpty
                            onChange={(e) => {
                              const next = [...editResultPenalties];
                              const pid = e.target.value as string;
                              const allPl = [...editResultHomePlayers, ...editResultAwayPlayers];
                              const pl = allPl.find((x) => x.id === pid);
                              next[idx] = { ...next[idx], targetId: pid || undefined, targetName: pl?.name };
                              setEditResultPenalties(next);
                            }}
                            sx={{ minWidth: { xs: 140, sm: 140 }, flex: { xs: '1 1 140px', sm: 'none' } }}
                            renderValue={(v) => {
                              const allPl = [...editResultHomePlayers, ...editResultAwayPlayers];
                              return allPl.find((x) => x.id === v)?.name ?? t('tournament.matches.selectPlayer');
                            }}
                          >
                            <MenuItem value="">{t('tournament.matches.selectPlayer')}</MenuItem>
                            {[...editResultHomePlayers, ...editResultAwayPlayers].map((pl) => (
                              <MenuItem key={pl.id} value={pl.id}>{pl.name}</MenuItem>
                            ))}
                          </Select>
                        )}
                        {p.type === 'team' && (
                          <Select
                            size="small"
                            value={p.targetId ?? ''}
                            displayEmpty
                            onChange={(e) => {
                              const next = [...editResultPenalties];
                              const tid = e.target.value as string;
                              const team = editResultMatch?.homeTeamId === tid ? editResultMatch?.homeTeam : editResultMatch?.awayTeam;
                              next[idx] = { ...next[idx], targetId: tid || undefined, targetName: team?.name };
                              setEditResultPenalties(next);
                            }}
                            sx={{ minWidth: { xs: 140, sm: 140 }, flex: { xs: '1 1 140px', sm: 'none' } }}
                            renderValue={(v) => {
                              if (v === editResultMatch?.homeTeamId) return editResultMatch?.homeTeam?.name;
                              if (v === editResultMatch?.awayTeamId) return editResultMatch?.awayTeam?.name;
                              return t('tournament.matches.penaltyTeam');
                            }}
                          >
                            <MenuItem value="">{t('tournament.matches.penaltyTeam')}</MenuItem>
                            <MenuItem value={editResultMatch?.homeTeamId}>{editResultMatch?.homeTeam?.name}</MenuItem>
                            <MenuItem value={editResultMatch?.awayTeamId}>{editResultMatch?.awayTeam?.name}</MenuItem>
                          </Select>
                        )}
                        {p.type === 'staff' && (
                          <TextField
                            size="small"
                            placeholder={t('tournament.matches.penaltyStaff')}
                            value={p.targetName ?? ''}
                            onChange={(e) => {
                              const next = [...editResultPenalties];
                              next[idx] = { ...next[idx], targetName: e.target.value };
                              setEditResultPenalties(next);
                            }}
                            sx={{ minWidth: { xs: 140, sm: 140 }, flex: { xs: '1 1 140px', sm: 'none' } }}
                          />
                        )}
                        <TextField
                          size="small"
                          placeholder={t('tournament.matches.penaltyDescription')}
                          value={p.description ?? ''}
                          onChange={(e) => {
                            const next = [...editResultPenalties];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setEditResultPenalties(next);
                          }}
                          sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: 0, sm: 120 } }}
                        />
                        <TextField
                          size="small"
                          placeholder={t('tournament.matches.penaltyAmount')}
                          type="number"
                          value={p.amount ?? ''}
                          onChange={(e) => {
                            const next = [...editResultPenalties];
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            next[idx] = { ...next[idx], amount: val, currency: (val != null ? p.currency : undefined) ?? userCurrency };
                            setEditResultPenalties(next);
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                {p.currency ?? userCurrency}
                              </InputAdornment>
                            ),
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: { xs: 100, sm: 120 }, minWidth: 80 }}
                        />
                        <IconButton size="small" onClick={() => setEditResultPenalties((prev) => prev.filter((_, i) => i !== idx))}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setEditResultPenalties((prev) => [...prev, { type: 'player' as const, currency: userCurrency }])}>
                      {t('tournament.matches.addPenalty')}
                    </Button>
                  </>
                )}

                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setEditResultHome('');
                      setEditResultAway('');
                      setEditResultStats({});
                      setEditResultMatchEvents([]);
                      setEditResultExtraPoints({ home: '', away: '' });
                      setEditResultPenalties([]);
                    }}
                  >
                    {t('tournament.matches.clearResult')}
                  </Button>
                </Box>
              </DialogContent>
              <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: { xs: 2, sm: 3 }, pb: 2 }}>
                <Button onClick={() => setEditResultOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!editResultMatch) return;
                    setEditResultValidationError('');
                    const homeScore = editResultHome === '' ? 0 : Math.max(0, parseInt(String(editResultHome).trim(), 10) || 0);
                    const awayScore = editResultAway === '' ? 0 : Math.max(0, parseInt(String(editResultAway).trim(), 10) || 0);
                    const totalScore = homeScore + awayScore;
                    // Sum goals from scorer rows (each row can have goals > 1); normalize type in case API returns different casing
                    const goalEvents = editResultMatchEvents.filter(
                      (e) => e && String((e as { type?: string }).type ?? '').toLowerCase() === 'goal'
                    );
                    const totalGoalsFromEvents = goalEvents.reduce(
                      (sum, e) => sum + (Math.max(1, (e as MatchEvent & { goals?: number }).goals ?? 1)),
                      0
                    );
                    if (editResultHome !== '' && editResultAway !== '' && Number(totalGoalsFromEvents) !== Number(totalScore)) {
                      setEditResultValidationError(t('tournament.matches.validationGoalsMismatch'));
                      return;
                    }
                    if (tournament.sport === 'soccer' || tournament.sport === 'futsal') {
                      const yellowHome = editResultStats.yellowCards?.home !== undefined && editResultStats.yellowCards?.home !== ''
                        ? Math.max(0, parseInt(editResultStats.yellowCards.home, 10) || 0) : 0;
                      const yellowAway = editResultStats.yellowCards?.away !== undefined && editResultStats.yellowCards?.away !== ''
                        ? Math.max(0, parseInt(editResultStats.yellowCards.away, 10) || 0) : 0;
                      const redHome = editResultStats.redCards?.home !== undefined && editResultStats.redCards?.home !== ''
                        ? Math.max(0, parseInt(editResultStats.redCards.home, 10) || 0) : 0;
                      const redAway = editResultStats.redCards?.away !== undefined && editResultStats.redCards?.away !== ''
                        ? Math.max(0, parseInt(editResultStats.redCards.away, 10) || 0) : 0;
                      const cardEvents = editResultMatchEvents.filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
                      const yellowFromEvents = cardEvents.filter((e) => e.type === 'yellow_card');
                      const redFromEvents = cardEvents.filter((e) => e.type === 'red_card');
                      const yellowHomeEvents = yellowFromEvents.filter((e) => e.teamSide === 'home').length;
                      const yellowAwayEvents = yellowFromEvents.filter((e) => e.teamSide === 'away').length;
                      const redHomeEvents = redFromEvents.filter((e) => e.teamSide === 'home').length;
                      const redAwayEvents = redFromEvents.filter((e) => e.teamSide === 'away').length;
                      if (yellowHome !== yellowHomeEvents || yellowAway !== yellowAwayEvents ||
                          redHome !== redHomeEvents || redAway !== redAwayEvents) {
                        setEditResultValidationError(t('tournament.matches.validationCardsMismatch'));
                        return;
                      }
                    }
                    setEditResultSubmitting(true);
                    try {
                      const statFields = getStatisticsForSport(tournament.sport);
                      const statistics: Record<string, number> = {};
                      statFields.forEach((f) => {
                        const h = editResultStats[f.key]?.home;
                        const a = editResultStats[f.key]?.away;
                        statistics[f.homeKey] = h !== undefined && h !== '' ? Math.max(0, parseInt(h, 10) || 0) : 0;
                        statistics[f.awayKey] = a !== undefined && a !== '' ? Math.max(0, parseInt(a, 10) || 0) : 0;
                      });
                      const extraHome = editResultExtraPoints.home !== '' ? Math.max(0, parseInt(editResultExtraPoints.home, 10) || 0) : 0;
                      const extraAway = editResultExtraPoints.away !== '' ? Math.max(0, parseInt(editResultExtraPoints.away, 10) || 0) : 0;
                      const updatePayload: {
                        homeScore: number | null;
                        awayScore: number | null;
                        statistics?: Record<string, number>;
                        matchEvents: MatchEvent[] | null;
                        matchExtraPoints?: { home: number; away: number } | null;
                        matchPenalties?: MatchPenalty[] | null;
                      } = {
                        homeScore:
                          editResultHome === ''
                            ? null
                            : Math.max(0, parseInt(editResultHome, 10) || 0),
                        awayScore:
                          editResultAway === ''
                            ? null
                            : Math.max(0, parseInt(editResultAway, 10) || 0),
                        statistics: statFields.length > 0 ? statistics : undefined,
                        matchEvents: (() => {
                          if (editResultMatchEvents.length === 0) return null;
                          const expanded: MatchEvent[] = [];
                          for (const e of editResultMatchEvents) {
                            const { goals, ...rest } = e as MatchEvent & { goals?: number };
                            const count = e.type === 'goal' ? Math.max(1, goals ?? 1) : 1;
                            for (let i = 0; i < count; i++) {
                              expanded.push(rest);
                            }
                          }
                          return expanded;
                        })(),
                      };
                      if (tournamentIsPro) {
                        updatePayload.matchExtraPoints = extraHome > 0 || extraAway > 0 ? { home: extraHome, away: extraAway } : null;
                        updatePayload.matchPenalties =
                          editResultPenalties.length > 0
                            ? editResultPenalties.map((p) => ({
                                type: p.type,
                                targetId: p.targetId,
                                targetName: p.targetName,
                                description: p.description,
                                amount: p.amount,
                                currency: p.currency ?? userCurrency,
                              }))
                            : null;
                      }
                      const updated = await updateMatch(tournament.id, editResultMatch.id, updatePayload);
                      setMatches((prev) =>
                        prev.map((m) => (m.id === updated.id ? updated : m))
                      );
                      setEditResultOpen(false);
                    } finally {
                      setEditResultSubmitting(false);
                    }
                  }}
                  disabled={editResultSubmitting}
                >
                  {editResultSubmitting ? t('team.add.submitting') : t('tournament.matches.save')}
                </Button>
              </DialogActions>
            </Dialog>

            <Popover
              open={!!matchStatsPopover}
              anchorEl={matchStatsPopover?.anchor}
              onClose={() => setMatchStatsPopover(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{ sx: { p: 2, maxWidth: 360 } }}
            >
              {matchStatsPopover?.match && (() => {
                const m = matchStatsPopover.match;
                const statFields = getStatisticsForSport(tournament.sport);
                const stats = m.statistics ?? {};
                const goals = (m.matchEvents ?? []).filter((e) => e.type === 'goal');
                const cards = (m.matchEvents ?? []).filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {m.homeTeam?.name ?? '-'} vs {m.awayTeam?.name ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('tournament.matches.scheduledAt')}: {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('tournament.matches.venue')}: {m.venue?.name ?? tournament.isSingleVenue ? (tournament.venueName ?? '—') : '—'}
                    </Typography>
                    {m.homeScore != null && m.awayScore != null && (
                      <Typography variant="body2" fontWeight={600}>
                        {t('tournament.matches.homeScore')}: {m.homeScore} – {t('tournament.matches.awayScore')}: {m.awayScore}
                      </Typography>
                    )}
                    {statFields.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {t('tournament.matches.matchStats')}
                        </Typography>
                        {statFields.map((f) => (
                          <Typography key={f.key} variant="body2">
                            {t(`tournament.matches.${f.labelKey}`)}: {stats[f.homeKey] ?? 0} ({t('tournament.matches.home')}) – {stats[f.awayKey] ?? 0} ({t('tournament.matches.away')})
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {goals.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {t('tournament.matches.goalScorers')}
                        </Typography>
                        {goals.map((g, i) => (
                          <Typography key={`${m.id}-goal-${i}-${g.playerId ?? ''}-${g.minute ?? ''}`} variant="body2">
                            {g.playerName ?? '-'} ({g.teamSide === 'home' ? m.homeTeam?.name : m.awayTeam?.name}){g.ownGoal ? ` (${t('tournament.matches.ownGoal')})` : ''}{g.minute != null ? ` ${g.minute}'` : ''}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {cards.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {t('tournament.matches.stats.yellowCards')} / {t('tournament.matches.stats.redCards')}
                        </Typography>
                        {cards.map((c, i) => (
                          <Typography key={`${m.id}-card-${i}-${c.type}-${c.playerId ?? ''}-${c.minute ?? ''}`} variant="body2">
                            {c.type === 'yellow_card' ? t('tournament.matches.stats.yellowCards') : t('tournament.matches.stats.redCards')}: {c.playerName ?? '-'} ({c.teamSide === 'home' ? m.homeTeam?.name : m.awayTeam?.name}){c.minute != null ? ` ${c.minute}'` : ''}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })()}
            </Popover>

            <Dialog
              open={addTeamOpen}
              onClose={() => {
                setAddTeamOpen(false);
                setAddTeamMode('create');
                setSelectedExistingTeamId('');
                setAddTeamError('');
              }}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>{t('team.add.title')}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {tournamentIsPro && (
                  <Tabs
                    value={addTeamMode}
                    onChange={(_, v: 'create' | 'existing') => setAddTeamMode(v)}
                    sx={{ mb: 1, minHeight: 36 }}
                  >
                    <Tab value="create" label={t('team.add.createNew')} />
                    <Tab value="existing" label={t('team.add.addExisting')} />
                  </Tabs>
                )}
                {addTeamError && (
                  <Typography variant="body2" color="error">{addTeamError}</Typography>
                )}
                {addTeamMode === 'create' ? (
                  <>
                    <TextField
                      label={t('team.add.name')}
                      value={addTeamName}
                      onChange={(e) => setAddTeamName(e.target.value)}
                      fullWidth
                      required
                    />
                    <TextField
                      label={t('team.add.description')}
                      value={addTeamDesc}
                      onChange={(e) => setAddTeamDesc(e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                    />
                    <TextField
                      label={t('team.add.ownerEmail')}
                      type="email"
                      value={addTeamEmail}
                      onChange={(e) => setAddTeamEmail(e.target.value)}
                      fullWidth
                      required
                    />
                  </>
                ) : (
                  <>
                    {availableTeamsLoading ? (
                      <Typography variant="body2" color="text.secondary">{t('team.add.loadingAvailable')}</Typography>
                    ) : availableTeams.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">{t('team.add.noAvailableTeams')}</Typography>
                    ) : (
                      <FormControl fullWidth>
                        <InputLabel>{t('team.add.selectExisting')}</InputLabel>
                        <Select
                          value={selectedExistingTeamId}
                          label={t('team.add.selectExisting')}
                          onChange={(e) => setSelectedExistingTeamId(e.target.value)}
                        >
                          {availableTeams.map((team) => (
                            <MenuItem key={team.id} value={team.id}>
                              {team.name}
                              {team.tournament?.name && ` (${team.tournament.name})`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setAddTeamOpen(false);
                    setAddTeamMode('create');
                    setSelectedExistingTeamId('');
                    setAddTeamError('');
                  }}
                >
                  {t('tournament.create.cancel')}
                </Button>
                {addTeamMode === 'create' ? (
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!addTeamName.trim() || !addTeamEmail.trim()) return;
                      setAddTeamSubmitting(true);
                      setAddTeamError('');
                      try {
                        const result = await createTeam(tournament.id, {
                          name: addTeamName.trim(),
                          description: addTeamDesc.trim() || undefined,
                          ownerEmail: addTeamEmail.trim(),
                        });
                        setAddTeamOpen(false);
                        const updated = await getTournament(slugOrId ?? '');
                        setTournament(updated);
                        const inviteUrl = result.inviteUrl;
                        if (inviteUrl) {
                          try {
                            await navigator.clipboard.writeText(inviteUrl);
                          } catch {
                            /* ignore */
                          }
                        }
                      } catch (err) {
                        setAddTeamError(err instanceof Error ? err.message : t('team.add.error'));
                      } finally {
                        setAddTeamSubmitting(false);
                      }
                    }}
                    disabled={addTeamSubmitting || !addTeamName.trim() || !addTeamEmail.trim()}
                  >
                    {addTeamSubmitting ? t('team.add.submitting') : t('team.add.submit')}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!selectedExistingTeamId) return;
                      setAddTeamSubmitting(true);
                      setAddTeamError('');
                      try {
                        await addExistingTeam(tournament.id, selectedExistingTeamId);
                        setAddTeamOpen(false);
                        const updated = await getTournament(slugOrId ?? '');
                        setTournament(updated);
                      } catch (err) {
                        setAddTeamError(err instanceof Error ? err.message : t('team.add.error'));
                      } finally {
                        setAddTeamSubmitting(false);
                      }
                    }}
                    disabled={addTeamSubmitting || !selectedExistingTeamId || availableTeamsLoading}
                  >
                    {addTeamSubmitting ? t('team.add.addExistingSubmitting') : t('team.add.addExistingSubmit')}
                  </Button>
                )}
              </DialogActions>
            </Dialog>

            {/* Edit tournament dialog */}
            <Dialog
              open={editTournamentOpen}
              onClose={() => setEditTournamentOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>{t('tournament.detail.edit')}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, maxHeight: '80vh', overflow: 'auto' }}>
                {editTournamentError && (
                  <Typography variant="body2" color="error">
                    {editTournamentError}
                  </Typography>
                )}
                <TextField
                  label={t('tournament.create.general.name')}
                  value={editTournamentForm.name}
                  onChange={(e) =>
                    setEditTournamentForm((f) => ({ ...f, name: e.target.value }))
                  }
                  fullWidth
                  required
                />
                <FormControl fullWidth>
                  <InputLabel>{t('tournament.create.sport.select')}</InputLabel>
                  <Select
                    value={editTournamentForm.sport}
                    label={t('tournament.create.sport.select')}
                    onChange={(e) =>
                      setEditTournamentForm((f) => ({ ...f, sport: e.target.value }))
                    }
                  >
                    {SPORTS.map(({ value, labelKey }) => (
                      <MenuItem key={value} value={value}>
                        {t(`tournament.create.sport.options.${labelKey}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl component="fieldset">
                  <FormLabel component="legend">{t('tournament.create.categoryType.title')}</FormLabel>
                  <RadioGroup
                    row
                    value={editTournamentForm.categoryType}
                    onChange={(e) =>
                      setEditTournamentForm((f) => ({
                        ...f,
                        categoryType: e.target.value,
                        tournamentType: e.target.value === 'ages' ? 'ages' : 'open',
                      }))
                    }
                  >
                    <FormControlLabel value="none" control={<Radio />} label={t('tournament.create.categoryType.none')} />
                    <FormControlLabel value="ages" control={<Radio />} label={t('tournament.create.categoryType.ages')} />
                  </RadioGroup>
                </FormControl>
                {editTournamentForm.categoryType === 'ages' && (
                  <Box>
                    <FormLabel sx={{ mb: 1, display: 'block' }}>{t('tournament.create.ageCategories.title')}</FormLabel>
                    {editTournamentForm.ageCategories.map((cat) => (
                      <Box key={cat.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap' }}>
                        <TextField
                          label={t('tournament.create.ageCategories.name')}
                          value={cat.name}
                          onChange={(e) =>
                            setEditTournamentForm((f) => ({
                              ...f,
                              ageCategories: f.ageCategories.map((c) =>
                                c.id === cat.id ? { ...c, name: e.target.value } : c
                              ),
                            }))
                          }
                          size="small"
                          sx={{ flex: '1 1 140px', minWidth: 120 }}
                        />
                        <TextField
                          label={t('tournament.create.ageCategories.minBirthYear')}
                          type="number"
                          value={cat.minBirthYear || ''}
                          onChange={(e) =>
                            setEditTournamentForm((f) => ({
                              ...f,
                              ageCategories: f.ageCategories.map((c) =>
                                c.id === cat.id ? { ...c, minBirthYear: Number(e.target.value) || 0 } : c
                              ),
                            }))
                          }
                          inputProps={{ min: 1900, max: new Date().getFullYear() }}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <TextField
                          label={t('tournament.create.ageCategories.maxBirthYear')}
                          type="number"
                          value={cat.maxBirthYear || ''}
                          onChange={(e) =>
                            setEditTournamentForm((f) => ({
                              ...f,
                              ageCategories: f.ageCategories.map((c) =>
                                c.id === cat.id ? { ...c, maxBirthYear: Number(e.target.value) || 0 } : c
                              ),
                            }))
                          }
                          inputProps={{ min: 1900, max: new Date().getFullYear() }}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() =>
                            setEditTournamentForm((f) => ({
                              ...f,
                              ageCategories:
                                f.ageCategories.length <= 1
                                  ? f.ageCategories
                                  : f.ageCategories.filter((c) => c.id !== cat.id),
                            }))
                          }
                          disabled={editTournamentForm.ageCategories.length <= 1}
                          aria-label={t('tournament.create.ageCategories.remove')}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() =>
                        setEditTournamentForm((f) => ({
                          ...f,
                          ageCategories: [
                            ...f.ageCategories,
                            {
                              id: `cat-${Date.now()}`,
                              name: '',
                              minBirthYear: new Date().getFullYear() - 50,
                              maxBirthYear: new Date().getFullYear(),
                            },
                          ],
                        }))
                      }
                      variant="outlined"
                      size="small"
                    >
                      {t('tournament.create.ageCategories.add')}
                    </Button>
                  </Box>
                )}
                <TextField
                  label={t('tournament.create.general.description')}
                  value={editTournamentForm.description}
                  onChange={(e) =>
                    setEditTournamentForm((f) => ({ ...f, description: e.target.value }))
                  }
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label={t('tournament.create.general.startDate')}
                  type="date"
                  value={editTournamentForm.startDate}
                  onChange={(e) =>
                    setEditTournamentForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label={t('tournament.create.general.endDate')}
                  type="date"
                  value={editTournamentForm.endDate}
                  onChange={(e) =>
                    setEditTournamentForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label={t('tournament.create.general.location')}
                  value={editTournamentForm.location}
                  onChange={(e) =>
                    setEditTournamentForm((f) => ({ ...f, location: e.target.value }))
                  }
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editTournamentForm.isSingleVenue}
                      onChange={(e) =>
                        setEditTournamentForm((f) => ({
                          ...f,
                          isSingleVenue: e.target.checked,
                        }))
                      }
                    />
                  }
                  label={t('tournament.detail.singleVenue')}
                />
                {editTournamentForm.isSingleVenue && (
                  <TextField
                    label={t('tournament.detail.singleVenueName')}
                    value={editTournamentForm.venueName}
                    onChange={(e) =>
                      setEditTournamentForm((f) => ({ ...f, venueName: e.target.value }))
                    }
                    fullWidth
                    placeholder={t('tournament.detail.singleVenueDesc')}
                  />
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditTournamentOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  variant="contained"
                    onClick={async () => {
                    if (!editTournamentForm.name.trim() || !editTournamentForm.sport) return;
                    setEditTournamentSubmitting(true);
                    setEditTournamentError('');
                    try {
                      const payload: Parameters<typeof updateTournament>[1] = {
                        name: editTournamentForm.name.trim(),
                        sport: editTournamentForm.sport,
                        categoryType: editTournamentForm.categoryType as 'none' | 'ages',
                        tournamentType: editTournamentForm.tournamentType as 'open' | 'ages',
                        description: editTournamentForm.description || undefined,
                        startDate: editTournamentForm.startDate || undefined,
                        endDate: editTournamentForm.endDate || undefined,
                        location: editTournamentForm.location || undefined,
                        isSingleVenue: editTournamentForm.isSingleVenue,
                        venueName: editTournamentForm.isSingleVenue
                          ? editTournamentForm.venueName.trim() || null
                          : null,
                      };
                      if (editTournamentForm.categoryType === 'ages' && editTournamentForm.ageCategories.length > 0) {
                        payload.ageCategories = editTournamentForm.ageCategories.map((c) => ({
                          name: c.name,
                          minBirthYear: c.minBirthYear,
                          maxBirthYear: c.maxBirthYear,
                        }));
                      }
                      const updated = await updateTournament(tournament.id, payload);
                      setTournament({ ...updated, isTournamentAdmin: true });
                      setEditTournamentOpen(false);
                    } catch (err) {
                      setEditTournamentError(
                        err instanceof Error ? err.message : t('tournament.create.error')
                      );
                    } finally {
                      setEditTournamentSubmitting(false);
                    }
                  }}
                  disabled={
                    editTournamentSubmitting ||
                    !editTournamentForm.name.trim() ||
                    !editTournamentForm.sport
                  }
                >
                  {editTournamentSubmitting ? t('team.add.submitting') : t('tournament.matches.save')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Suspend confirm */}
            <Dialog open={confirmSuspendOpen} onClose={() => setConfirmSuspendOpen(false)}>
              <DialogTitle>{t('tournament.detail.suspend')}</DialogTitle>
              <DialogContent>
                <Typography>{t('tournament.detail.suspendConfirm')}</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmSuspendOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  color="warning"
                  variant="contained"
                  onClick={async () => {
                    setActionSubmitting(true);
                    try {
                      const updated = await suspendTournament(tournament.id);
                      setTournament({ ...updated, isTournamentAdmin: true });
                      setConfirmSuspendOpen(false);
                    } finally {
                      setActionSubmitting(false);
                    }
                  }}
                  disabled={actionSubmitting}
                >
                  {t('tournament.detail.suspend')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Renew confirm */}
            <Dialog open={confirmRenewOpen} onClose={() => setConfirmRenewOpen(false)}>
              <DialogTitle>{t('tournament.detail.renew')}</DialogTitle>
              <DialogContent>
                <Typography>{t('tournament.detail.renewConfirm')}</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmRenewOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  color="success"
                  variant="contained"
                  onClick={async () => {
                    setActionSubmitting(true);
                    try {
                      const updated = await renewTournament(tournament.id);
                      setTournament({ ...updated, isTournamentAdmin: true });
                      setConfirmRenewOpen(false);
                    } finally {
                      setActionSubmitting(false);
                    }
                  }}
                  disabled={actionSubmitting}
                >
                  {t('tournament.detail.renew')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Customize colors dialog */}
            {tournament && (
              <CustomizeColorsDialog
                open={colorsDialogOpen}
                onClose={() => setColorsDialogOpen(false)}
                tournament={tournament}
                matches={matches}
                standings={standings}
                standingsByGroup={standingsByGroup}
                loadingMatches={loadingMatches}
                loadingStandings={loadingStandings}
                onSave={async (params) => {
                  const updated = await updateTournament(tournament.id, params);
                  setTournament({ ...updated, isTournamentAdmin: true });
                }}
              />
            )}

            {/* Generate report dialog */}
            {tournament && (
              <GenerateReportDialog
                open={reportDialogOpen}
                onClose={() => setReportDialogOpen(false)}
                tournament={tournament}
                matches={matches}
              />
            )}

            {/* Delete confirm */}
            <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
              <DialogTitle>{t('tournament.detail.delete')}</DialogTitle>
              <DialogContent>
                <Typography>{t('tournament.detail.deleteConfirm')}</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmDeleteOpen(false)}>
                  {t('tournament.create.cancel')}
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={async () => {
                    setActionSubmitting(true);
                    try {
                      await deleteTournament(tournament.id);
                      setConfirmDeleteOpen(false);
                      navigate('/');
                    } finally {
                      setActionSubmitting(false);
                    }
                  }}
                  disabled={actionSubmitting}
                >
                  {t('tournament.detail.delete')}
                </Button>
              </DialogActions>
            </Dialog>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
