import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from '@shared/theme';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PlaceIcon from '@mui/icons-material/Place';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import {
  addPlayer,
  addTeamVenue,
  addTechnicalStaff,
  addUniform,
  getTeam,
  listTeamPlayerChangeRequests,
  removePlayer,
  removeTeamVenue,
  removeTechnicalStaff,
  removeUniform,
  setPlayerCategoryForTournament,
  uploadPlayerFile,
  updateTeamVenue,
  updateTechnicalStaff,
  updateUniform,
} from '@shared/api/teams';
import type { Player, Team, TeamTechnicalStaff, TeamUniform, TeamVenue } from '@shared/api/teams';
import { buildBirthDateFromParts, formatPlayerBirthDisplay, getAgeFromBirthDate, isPlayerMinor } from '@shared/utils/dateUtils';
import { fileToBase64 } from '@shared/utils/fileUtils';
import { BirthDateSelects } from '@components/BirthDateSelects';
import { DocumentTypeSelect } from '@components/DocumentTypeSelect';
import { FileUploadButton } from '@components/FileUploadButton';
import { GuardianRelationSelect } from '@components/GuardianRelationSelect';

import { TeamRosterPdfDialog } from './TeamRosterPdfDialog';

const theme = appTheme;

export type TeamDetailPageProps = {
  /** When true, render without AppBar for embedding inside Dashboard */
  embedded?: boolean;
  /** Team ID when embedded (otherwise from route params) */
  teamId?: string;
  /** When embedded, called when user goes back */
  onClose?: () => void;
};

export const TeamDetailPage = (props: TeamDetailPageProps = {}) => {
  const { embedded = false, teamId: teamIdProp, onClose } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: idFromParams } = useParams<{ id: string }>();
  const id = embedded ? teamIdProp ?? idFromParams : idFromParams;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [playerFirstName, setPlayerFirstName] = useState('');
  const [playerLastName, setPlayerLastName] = useState('');
  const [playerBirthDay, setPlayerBirthDay] = useState<number | ''>('');
  const [playerBirthMonth, setPlayerBirthMonth] = useState<number | ''>('');
  const [playerBirthYear, setPlayerBirthYear] = useState<number | ''>('');
  const [playerCategoryId, setPlayerCategoryId] = useState('');
  const [playerIdDocumentType, setPlayerIdDocumentType] = useState('');
  const [playerIdDocumentNumber, setPlayerIdDocumentNumber] = useState('');
  const [playerGuardianName, setPlayerGuardianName] = useState('');
  const [playerGuardianRelation, setPlayerGuardianRelation] = useState('');
  const [playerGuardianIdNumber, setPlayerGuardianIdNumber] = useState('');
  const [playerGuardianPhone, setPlayerGuardianPhone] = useState('');
  const [playerGuardianEmail, setPlayerGuardianEmail] = useState('');
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [playerDocIdFile, setPlayerDocIdFile] = useState<File | null>(null);
  const [playerDocBirthFile, setPlayerDocBirthFile] = useState<File | null>(null);
  const [playerDocGuardianFile, setPlayerDocGuardianFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addVenueOpen, setAddVenueOpen] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueIsOfficial, setVenueIsOfficial] = useState(true);
  const [venueSubmitting, setVenueSubmitting] = useState(false);
  const [venueError, setVenueError] = useState('');
  const [editVenueOpen, setEditVenueOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<TeamVenue | null>(null);
  const [editVenueName, setEditVenueName] = useState('');
  const [editVenueIsOfficial, setEditVenueIsOfficial] = useState(true);
  const [editVenueSubmitting, setEditVenueSubmitting] = useState(false);
  const [editVenueError, setEditVenueError] = useState('');
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [staffFullName, setStaffFullName] = useState('');
  const [staffIdNumber, setStaffIdNumber] = useState('');
  const [staffType, setStaffType] = useState<'coach' | 'assistant' | 'masseur' | 'utilero'>('coach');
  const [staffCoachLicense, setStaffCoachLicense] = useState('');
  const [staffPhotoFile, setStaffPhotoFile] = useState<File | null>(null);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<TeamTechnicalStaff | null>(null);
  const [editStaffFullName, setEditStaffFullName] = useState('');
  const [editStaffIdNumber, setEditStaffIdNumber] = useState('');
  const [editStaffType, setEditStaffType] = useState<'coach' | 'assistant' | 'masseur' | 'utilero'>('coach');
  const [editStaffCoachLicense, setEditStaffCoachLicense] = useState('');
  const [editStaffSubmitting, setEditStaffSubmitting] = useState(false);
  const [editStaffError, setEditStaffError] = useState('');
  const [addUniformOpen, setAddUniformOpen] = useState(false);
  const [uniformJersey, setUniformJersey] = useState('');
  const [uniformShorts, setUniformShorts] = useState('');
  const [uniformSocks, setUniformSocks] = useState('');
  const [uniformSubmitting, setUniformSubmitting] = useState(false);
  const [uniformError, setUniformError] = useState('');
  const [editUniformOpen, setEditUniformOpen] = useState(false);
  const [editingUniform, setEditingUniform] = useState<TeamUniform | null>(null);
  const [editUniformJersey, setEditUniformJersey] = useState('');
  const [editUniformShorts, setEditUniformShorts] = useState('');
  const [editUniformSocks, setEditUniformSocks] = useState('');
  const [editUniformSubmitting, setEditUniformSubmitting] = useState(false);
  const [editUniformError, setEditUniformError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<Player | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  /** When team participates in multiple tournaments, which one we're viewing/editing categories for. */
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [playersCategoryFilter, setPlayersCategoryFilter] = useState<string>('');
  const [categoryUpdating, setCategoryUpdating] = useState<string | null>(null);
  const [pendingChangeCount, setPendingChangeCount] = useState(0);
  const [pendingRequestPlayerIds, setPendingRequestPlayerIds] = useState<Set<string>>(new Set());
  const [rosterPdfOpen, setRosterPdfOpen] = useState(false);

  const loadTeam = useCallback(() => {
    if (!id) return;
    getTeam(id)
      .then((teamData) => {
        setTeam(teamData);
        listTeamPlayerChangeRequests(id, 'pending')
          .then((list) => {
            setPendingChangeCount(list.length);
            const ids = new Set(list.map((r) => r.playerId).filter((pid): pid is string => !!pid));
            setPendingRequestPlayerIds(ids);
          })
          .catch(() => {
            setPendingChangeCount(0);
            setPendingRequestPlayerIds(new Set());
          });
      })
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(loadTeam, [loadTeam]);

  const participatingTournaments = useMemo(() => {
    if (!team) return [];
    if (team.participatingTournaments?.length) return team.participatingTournaments;
    if (team.tournament?.id) {
      return [{
        id: team.tournament.id,
        name: team.tournament.name ?? '',
        slug: team.tournament.slug ?? '',
        categoryType: team.tournament.categoryType ?? 'open',
        ageCategories: team.tournament.ageCategories ?? [],
      }];
    }
    return [];
  }, [team]);

  useEffect(() => {
    if (team && selectedTournamentId === null) setSelectedTournamentId(team.tournamentId);
  }, [team, selectedTournamentId]);

  const selectedTournament = useMemo(
    () => participatingTournaments.find((t) => t.id === selectedTournamentId) ?? participatingTournaments[0] ?? null,
    [participatingTournaments, selectedTournamentId]
  );
  const ageCategories = selectedTournament?.ageCategories ?? team?.tournament?.ageCategories ?? [];
  const hasAgeCategories = (selectedTournament?.categoryType === 'ages' && ageCategories.length > 0) || (team?.tournament?.ageCategories?.length ?? 0) > 0;
  const primaryAgeCategories = team?.tournament?.ageCategories ?? [];
  const hasPrimaryAgeCategories = primaryAgeCategories.length > 0;
  const players = team?.players || [];
  const PLAYERS_PAGE_SIZE = 10;
  const [playersPage, setPlayersPage] = useState(1);
  type PlayersOrderBy = 'name' | 'birthYear' | 'category';
  const [playersOrderBy, setPlayersOrderBy] = useState<PlayersOrderBy>('name');
  const [playersOrder, setPlayersOrder] = useState<'asc' | 'desc'>('asc');

  /** Category name for PDF (e.g. "U15", "U17"). Uses primary tournament age categories; with multiple categories, derives from most common among players. */
  const rosterPdfCategoryName = useMemo(() => {
    const categories = team?.tournament?.ageCategories ?? [];
    if (categories.length === 0) return null;
    if (categories.length === 1) return categories[0].name;
    const primaryId = team?.tournamentId;
    if (!primaryId || !players.length) return categories[0].name;
    const counts: Record<string, number> = {};
    for (const p of players) {
      const catId = p.tournamentAgeCategoryId ?? p.categoryByTournament?.[primaryId]?.categoryId;
      const name = catId ? categories.find((c) => c.id === catId)?.name : null;
      if (name) counts[name] = (counts[name] ?? 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) return categories[0].name;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [team?.tournament?.ageCategories, team?.tournamentId, players]);

  const sortedPlayers = useMemo(() => {
    const list = [...players];
    list.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (playersOrderBy === 'name') {
        aVal = (a.name ?? '').toLowerCase();
        bVal = (b.name ?? '').toLowerCase();
      } else if (playersOrderBy === 'birthYear') {
        aVal = a.birthYear ?? 0;
        bVal = b.birthYear ?? 0;
      } else if (playersOrderBy === 'category' && selectedTournamentId) {
        aVal = (a.categoryByTournament?.[selectedTournamentId]?.categoryName ?? (selectedTournamentId === team?.tournamentId ? ageCategories.find((c) => c.id === a.tournamentAgeCategoryId)?.name ?? '' : '')).toLowerCase();
        bVal = (b.categoryByTournament?.[selectedTournamentId]?.categoryName ?? (selectedTournamentId === team?.tournamentId ? ageCategories.find((c) => c.id === b.tournamentAgeCategoryId)?.name ?? '' : '')).toLowerCase();
      }
      if (aVal < bVal) return playersOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return playersOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [players, playersOrderBy, playersOrder, selectedTournamentId, team?.tournamentId, ageCategories]);

  /** When hasAgeCategories: filter by selected category. Otherwise all sorted players. */
  const filteredPlayersForList = useMemo(() => {
    if (!hasAgeCategories || !playersCategoryFilter) return sortedPlayers;
    const getCatId = (p: (typeof players)[0]) =>
      !selectedTournamentId ? null : (p.categoryByTournament?.[selectedTournamentId]?.categoryId ?? (selectedTournamentId === team?.tournamentId ? p.tournamentAgeCategoryId ?? null : null));
    if (playersCategoryFilter === '__noCategory__') {
      return sortedPlayers.filter((p) => getCatId(p) == null);
    }
    return sortedPlayers.filter((p) => getCatId(p) === playersCategoryFilter);
  }, [hasAgeCategories, playersCategoryFilter, sortedPlayers, selectedTournamentId, team?.tournamentId]);

  const paginatedPlayers = useMemo(
    () => filteredPlayersForList.slice((playersPage - 1) * PLAYERS_PAGE_SIZE, playersPage * PLAYERS_PAGE_SIZE),
    [filteredPlayersForList, playersPage]
  );

  useEffect(() => {
    setPlayersPage(1);
  }, [playersCategoryFilter]);

  useEffect(() => {
    setPlayersCategoryFilter('');
  }, [selectedTournamentId]);

  const handlePlayersSort = (column: PlayersOrderBy) => {
    const isAsc = playersOrderBy === column && playersOrder === 'asc';
    setPlayersOrder(isAsc ? 'desc' : 'asc');
    setPlayersOrderBy(column);
    setPlayersPage(1);
  };
  const venues = team?.venues || [];
  const technicalStaff = team?.technicalStaff || [];
  const uniforms = team?.uniforms || [];
  const hasOfficialVenue = venues.some((v) => v.isOfficial);
  const tournamentsRequiringConfiguration = team?.tournamentsRequiringConfiguration || [];

  const handleAddVenue = async () => {
    if (!id || !venueName.trim()) return;
    setVenueSubmitting(true);
    setVenueError('');
    try {
      await addTeamVenue(id, { name: venueName.trim(), isOfficial: venueIsOfficial });
      setAddVenueOpen(false);
      setVenueName('');
      setVenueIsOfficial(true);
      loadTeam();
    } catch (err) {
      setVenueError(err instanceof Error ? err.message : 'Error');
    } finally {
      setVenueSubmitting(false);
    }
  };

  const handleRemoveVenue = async (venueId: string) => {
    if (!id) return;
    try {
      await removeTeamVenue(id, venueId);
      loadTeam();
    } catch {
      /* ignore */
    }
  };

  const handleOpenEditVenue = (venue: TeamVenue) => {
    setEditingVenue(venue);
    setEditVenueName(venue.name);
    setEditVenueIsOfficial(venue.isOfficial);
    setEditVenueError('');
    setEditVenueOpen(true);
  };

  const handleEditVenue = async () => {
    if (!id || !editingVenue || !editVenueName.trim()) return;
    setEditVenueSubmitting(true);
    setEditVenueError('');
    try {
      await updateTeamVenue(id, editingVenue.id, {
        name: editVenueName.trim(),
        isOfficial: editVenueIsOfficial,
      });
      setEditVenueOpen(false);
      setEditingVenue(null);
      loadTeam();
    } catch (err) {
      setEditVenueError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEditVenueSubmitting(false);
    }
  };

  const handleAddStaff = async () => {
    if (!id || !staffFullName.trim() || !staffIdNumber.trim()) return;
    setStaffSubmitting(true);
    setStaffError('');
    try {
      let photoUrl: string | undefined;
      if (staffPhotoFile) {
        const b64 = await fileToBase64(staffPhotoFile);
        const res = await uploadPlayerFile(id, 'photo', b64, staffPhotoFile.name, staffPhotoFile.type);
        photoUrl = res.url;
      }
      await addTechnicalStaff(id, {
        fullName: staffFullName.trim(),
        idDocumentNumber: staffIdNumber.trim(),
        type: staffType,
        coachLicense: staffCoachLicense.trim() || undefined,
        photoUrl: photoUrl ?? undefined,
      });
      setAddStaffOpen(false);
      setStaffFullName('');
      setStaffIdNumber('');
      setStaffType('coach');
      setStaffCoachLicense('');
      setStaffPhotoFile(null);
      loadTeam();
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Error');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleOpenEditStaff = (staff: TeamTechnicalStaff) => {
    setEditingStaff(staff);
    setEditStaffFullName(staff.fullName);
    setEditStaffIdNumber(staff.idDocumentNumber);
    setEditStaffType(staff.type as 'coach' | 'assistant' | 'masseur' | 'utilero');
    setEditStaffCoachLicense(staff.coachLicense ?? '');
    setEditStaffError('');
    setEditStaffOpen(true);
  };

  const handleEditStaff = async () => {
    if (!id || !editingStaff || !editStaffFullName.trim() || !editStaffIdNumber.trim()) return;
    setEditStaffSubmitting(true);
    setEditStaffError('');
    try {
      await updateTechnicalStaff(id, editingStaff.id, {
        fullName: editStaffFullName.trim(),
        idDocumentNumber: editStaffIdNumber.trim(),
        type: editStaffType,
        coachLicense: editStaffCoachLicense.trim() || undefined,
      });
      setEditStaffOpen(false);
      setEditingStaff(null);
      loadTeam();
    } catch (err) {
      setEditStaffError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEditStaffSubmitting(false);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!id) return;
    try {
      await removeTechnicalStaff(id, staffId);
      loadTeam();
    } catch {
      /* ignore */
    }
  };

  const handleAddUniform = async () => {
    if (!id || !uniformJersey.trim() || !uniformShorts.trim() || !uniformSocks.trim()) return;
    setUniformSubmitting(true);
    setUniformError('');
    try {
      await addUniform(id, {
        jerseyColor: uniformJersey.trim(),
        shortsColor: uniformShorts.trim(),
        socksColor: uniformSocks.trim(),
      });
      setAddUniformOpen(false);
      setUniformJersey('');
      setUniformShorts('');
      setUniformSocks('');
      loadTeam();
    } catch (err) {
      setUniformError(err instanceof Error ? err.message : 'Error');
    } finally {
      setUniformSubmitting(false);
    }
  };

  const handleOpenEditUniform = (uniform: TeamUniform) => {
    setEditingUniform(uniform);
    setEditUniformJersey(uniform.jerseyColor);
    setEditUniformShorts(uniform.shortsColor);
    setEditUniformSocks(uniform.socksColor);
    setEditUniformError('');
    setEditUniformOpen(true);
  };

  const handleEditUniform = async () => {
    if (!id || !editingUniform || !editUniformJersey.trim() || !editUniformShorts.trim() || !editUniformSocks.trim()) return;
    setEditUniformSubmitting(true);
    setEditUniformError('');
    try {
      await updateUniform(id, editingUniform.id, {
        jerseyColor: editUniformJersey.trim(),
        shortsColor: editUniformShorts.trim(),
        socksColor: editUniformSocks.trim(),
      });
      setEditUniformOpen(false);
      setEditingUniform(null);
      loadTeam();
    } catch (err) {
      setEditUniformError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEditUniformSubmitting(false);
    }
  };

  const handleRemoveUniform = async (uniformId: string) => {
    if (!id) return;
    try {
      await removeUniform(id, uniformId);
      loadTeam();
    } catch {
      /* ignore */
    }
  };

  const handleAddPlayer = async () => {
    const name = [playerFirstName.trim(), playerLastName.trim()].filter(Boolean).join(' ');
    if (!id || !name) return;
    setError('');
    const hasAnyBirthPart = playerBirthDay !== '' || playerBirthMonth !== '' || playerBirthYear !== '';
    if (hasAnyBirthPart) {
      const birthDateStr = buildBirthDateFromParts(playerBirthDay, playerBirthMonth, playerBirthYear);
      if (!birthDateStr) {
        setError(t('team.detail.birthDateInvalid'));
        return;
      }
    }
    if (hasPrimaryAgeCategories && playerCategoryId) {
      const category = primaryAgeCategories.find((c) => c.id === playerCategoryId);
      if (category && playerBirthYear !== '') {
        const birthYearNum = Number(playerBirthYear);
        if (birthYearNum < category.minBirthYear) {
          setError(
            t('team.detail.addPlayerBirthYearTooOld', {
              min: category.minBirthYear,
              category: category.name,
            })
          );
          return;
        }
      }
    }
    setSubmitting(true);
    setSuccessMessage('');
    try {
      let photoUrl: string | undefined;
      const documents: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }> = [];

      if (playerPhotoFile) {
        const b64 = await fileToBase64(playerPhotoFile);
        const res = await uploadPlayerFile(id, 'photo', b64, playerPhotoFile.name, playerPhotoFile.type);
        photoUrl = res.url;
      }
      if (playerDocIdFile) {
        const b64 = await fileToBase64(playerDocIdFile);
        const res = await uploadPlayerFile(id, 'player_id_copy', b64, playerDocIdFile.name, playerDocIdFile.type);
        documents.push({ documentType: 'player_id_copy', fileUrl: res.url, fileName: res.fileName, mimeType: res.mimeType });
      }
      if (playerDocBirthFile) {
        const b64 = await fileToBase64(playerDocBirthFile);
        const res = await uploadPlayerFile(id, 'birth_certificate', b64, playerDocBirthFile.name, playerDocBirthFile.type);
        documents.push({ documentType: 'birth_certificate', fileUrl: res.url, fileName: res.fileName, mimeType: res.mimeType });
      }
      if (playerDocGuardianFile) {
        const b64 = await fileToBase64(playerDocGuardianFile);
        const res = await uploadPlayerFile(id, 'guardian_id_copy', b64, playerDocGuardianFile.name, playerDocGuardianFile.type);
        documents.push({ documentType: 'guardian_id_copy', fileUrl: res.url, fileName: res.fileName, mimeType: res.mimeType });
      }

      const birthDateStr = buildBirthDateFromParts(playerBirthDay, playerBirthMonth, playerBirthYear);
      const result = await addPlayer(id, {
        name,
        firstName: playerFirstName.trim() || undefined,
        lastName: playerLastName.trim() || undefined,
        birthYear: playerBirthYear !== '' ? Number(playerBirthYear) : undefined,
        birthDate: birthDateStr ?? undefined,
        tournamentAgeCategoryId: playerCategoryId || undefined,
        idDocumentType: playerIdDocumentType || undefined,
        idDocumentNumber: playerIdDocumentNumber || undefined,
        guardianName: playerGuardianName.trim() || undefined,
        guardianRelation: playerGuardianRelation || undefined,
        guardianIdNumber: playerGuardianIdNumber.trim() || undefined,
        guardianPhone: playerGuardianPhone.trim() || undefined,
        guardianEmail: playerGuardianEmail.trim() || undefined,
        photoUrl: photoUrl || undefined,
        documents: documents.length ? documents : undefined,
      });
      setAddPlayerOpen(false);
      setPlayerFirstName('');
      setPlayerLastName('');
      setPlayerBirthDay('');
      setPlayerBirthMonth('');
      setPlayerBirthYear('');
      setPlayerCategoryId('');
      setPlayerIdDocumentType('');
      setPlayerIdDocumentNumber('');
      setPlayerGuardianName('');
      setPlayerGuardianRelation('');
      setPlayerGuardianIdNumber('');
      setPlayerGuardianPhone('');
      setPlayerGuardianEmail('');
      setPlayerPhotoFile(null);
      setPlayerDocIdFile(null);
      setPlayerDocBirthFile(null);
      setPlayerDocGuardianFile(null);
      if ('status' in result && result.status === 'pending') {
        setSuccessMessage(t('team.detail.playerRequestPending'));
      } else {
        loadTeam();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error';
      if (message === 'BIRTH_YEAR_TOO_OLD' && playerCategoryId) {
        const category = primaryAgeCategories.find((c) => c.id === playerCategoryId);
        setError(
          category
            ? t('team.detail.addPlayerBirthYearTooOld', { min: category.minBirthYear, category: category.name })
            : message
        );
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlayerCategoryChange = async (playerId: string, tournamentId: string, tournamentAgeCategoryId: string) => {
    if (!id || !tournamentAgeCategoryId) return;
    setCategoryUpdating(playerId);
    try {
      await setPlayerCategoryForTournament(id, playerId, { tournamentId, tournamentAgeCategoryId });
      loadTeam();
    } catch {
      /* ignore */
    } finally {
      setCategoryUpdating(null);
    }
  };

  const handleRemovePlayerClick = (p: Player) => setDeleteConfirmPlayer(p);

  const handleRemovePlayerConfirm = async () => {
    if (!id || !deleteConfirmPlayer) return;
    setDeleteSubmitting(true);
    setSuccessMessage('');
    try {
      const result = await removePlayer(id, deleteConfirmPlayer.id);
      setDeleteConfirmPlayer(null);
      if (result && 'status' in result && result.status === 'pending') {
        setSuccessMessage(t('team.detail.playerRequestPending'));
      } else {
        loadTeam();
      }
    } catch {
      /* ignore */
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading || !team) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ minHeight: embedded ? undefined : '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">
            {loading ? t('app.tournaments.loading') : t('tournament.detail.notFound')}
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: embedded ? undefined : '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        {!embedded && (
          <AppBar
            title={team.name}
            showBackButton
            onBackClick={() => navigate(-1)}
            backAriaLabel={t('tournament.create.back')}
          />
        )}

        <Box component="main" sx={{ flex: 1, py: embedded ? 2 : 4 }}>
          <Container maxWidth="md">
            {embedded && onClose && (
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={onClose}
                sx={{ mb: 2, textTransform: 'none' }}
              >
                {t('tournament.create.back')}
              </Button>
            )}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              {team.logoUrl ? (
                <Box
                  component="img"
                  src={team.logoUrl}
                  alt=""
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    objectFit: 'cover',
                    bgcolor: 'action.hover',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GroupsIcon sx={{ fontSize: 32, color: 'action.active' }} />
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {team.name}
                  </Typography>
                  {team.owner && (
                    <Typography variant="body2" color="text.secondary">
                      {t('team.detail.owner')}: {team.owner.name ? `${team.owner.name} (${team.owner.email})` : team.owner.email}
                    </Typography>
                  )}
                </Box>
                {pendingChangeCount > 0 && (
                  <Tooltip title={t('team.detail.pendingChangesTooltip')}>
                    <IconButton size="small" color="warning" aria-label={t('team.detail.pendingChangesTooltip')} sx={{ mt: -0.5 }}>
                      <WarningAmberIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Paper>
            {team.tournament?.id && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <EmojiEventsIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('team.detail.belongsToTournament')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  <Link
                    component="button"
                    variant="h6"
                    onClick={() => navigate(`/tournaments/${team.tournament?.slug || team.tournament?.id}`)}
                    sx={{ textAlign: 'left', fontWeight: 600 }}
                  >
                    {team.tournament.name || t('tournament.detail.title')}
                  </Link>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/tournaments/${team.tournament?.slug || team.tournament?.id}`)}
                  >
                    {t('team.detail.viewTournament')}
                  </Button>
                </Box>
                {(team.tournament.sport || team.tournament.location || team.tournament.startDate || team.tournament.endDate) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {[
                      team.tournament.sport && (t(`tournament.create.sport.options.${team.tournament.sport}`) || team.tournament.sport),
                      team.tournament.location,
                      team.tournament.startDate && `${t('tournament.detail.startDate')}: ${team.tournament.startDate}`,
                      team.tournament.endDate && `${t('tournament.detail.endDate')}: ${team.tournament.endDate}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                )}
                {team.tournament.description && (
                  <Typography variant="body2" color="text.secondary">
                    {team.tournament.description}
                  </Typography>
                )}
              </Paper>
            )}
            {successMessage && (
              <Alert severity="info" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}
            {tournamentsRequiringConfiguration.length > 0 && (
              <Alert
                severity="warning"
                icon={<WarningAmberIcon />}
                sx={{ mb: 3 }}
              >
                <Typography variant="body2" component="span">
                  {tournamentsRequiringConfiguration.length === 1
                    ? t('team.detail.addedToOtherTournamentWarning', {
                        name: tournamentsRequiringConfiguration[0].name,
                      })
                    : t('team.detail.addedToOtherTournamentsWarning')}
                </Typography>
                {tournamentsRequiringConfiguration.length > 1 && (
                  <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                    {tournamentsRequiringConfiguration.map((tr) => (
                      <li key={tr.id}>
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() =>
                            navigate(
                              `/tournaments/${tr.slug || tr.id}`
                            )
                          }
                          sx={{ textAlign: 'left' }}
                        >
                          {tr.name}
                        </Link>
                      </li>
                    ))}
                  </Box>
                )}
                {tournamentsRequiringConfiguration.length === 1 && (
                  <Box sx={{ mt: 1 }}>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() =>
                        navigate(
                          `/tournaments/${tournamentsRequiringConfiguration[0].slug || tournamentsRequiringConfiguration[0].id}`
                        )
                      }
                    >
                      {tournamentsRequiringConfiguration[0].name}
                    </Link>
                  </Box>
                )}
              </Alert>
            )}
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupsIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    {t('team.detail.title')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setAddPlayerOpen(true);
                    setPlayerFirstName('');
                    setPlayerLastName('');
                    setPlayerBirthDay('');
                    setPlayerBirthMonth('');
                    setPlayerBirthYear('');
                    setPlayerCategoryId('');
                    setPlayerIdDocumentType('');
                    setPlayerIdDocumentNumber('');
                    setPlayerGuardianName('');
                    setPlayerGuardianRelation('');
                    setPlayerGuardianPhone('');
                    setPlayerGuardianEmail('');
                    setPlayerPhotoFile(null);
                    setPlayerDocIdFile(null);
                    setPlayerDocBirthFile(null);
                    setPlayerDocGuardianFile(null);
                    setError('');
                  }}
                >
                  {t('team.detail.addPlayer')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => setRosterPdfOpen(true)}
                  disabled={!team?.players?.length}
                >
                  {t('team.detail.rosterPdf.previewInNewTab')}
                </Button>
              </Box>
              {team.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {team.description}
                </Typography>
              )}
              {participatingTournaments.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
                  <InputLabel id="team-tournament-context-label">{t('team.detail.tournamentContext')}</InputLabel>
                  <Select
                    labelId="team-tournament-context-label"
                    value={selectedTournamentId ?? ''}
                    label={t('team.detail.tournamentContext')}
                    onChange={(e) => setSelectedTournamentId(e.target.value as string)}
                  >
                    {participatingTournaments.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                        {t.categoryType === 'ages' && t.ageCategories?.length ? ` (${t.ageCategories.length} ${t('team.detail.categories')})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {selectedTournament?.categoryType === 'ages' && (selectedTournament.ageCategories?.length ?? 0) > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('team.detail.categoriesInTournament')}
                </Typography>
              )}
              {hasAgeCategories && ageCategories.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
                  <InputLabel id="team-players-category-filter">{t('team.detail.filterByCategory')}</InputLabel>
                  <Select
                    labelId="team-players-category-filter"
                    value={playersCategoryFilter}
                    label={t('team.detail.filterByCategory')}
                    onChange={(e) => setPlayersCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="">{t('team.detail.allCategories')}</MenuItem>
                    {ageCategories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                    <MenuItem value="__noCategory__">{t('team.detail.noCategory')}</MenuItem>
                  </Select>
                </FormControl>
              )}
              {players.length === 0 ? (
                <Typography color="text.secondary">{t('team.detail.noPlayers')}</Typography>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 60 }}>#</TableCell>
                          <TableCell sortDirection={playersOrderBy === 'name' ? playersOrder : false}>
                            <TableSortLabel active={playersOrderBy === 'name'} direction={playersOrderBy === 'name' ? playersOrder : 'asc'} onClick={() => handlePlayersSort('name')}>
                              {t('team.detail.playerName')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={playersOrderBy === 'birthYear' ? playersOrder : false}>
                            <TableSortLabel active={playersOrderBy === 'birthYear'} direction={playersOrderBy === 'birthYear' ? playersOrder : 'asc'} onClick={() => handlePlayersSort('birthYear')}>
                              {t('team.detail.birthYear')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>{t('team.detail.age')}</TableCell>
                          <TableCell>{t('team.detail.status')}</TableCell>
                          <TableCell sx={{ width: 100 }} align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedPlayers.map((p, idx) => {
                          const displayNum = (playersPage - 1) * PLAYERS_PAGE_SIZE + idx + 1;
                          const age = getAgeFromBirthDate(p.birthDate, p.birthYear);
                          return (
                            <TableRow key={p.id}>
                              <TableCell sx={{ width: 60 }}>{displayNum}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Link component="button" variant="body2" onClick={() => navigate(`/teams/${id}/players/${p.id}`, { state: { from: 'team' as const } })} sx={{ textAlign: 'left', textDecoration: 'none' }}>
                                    {p.name}
                                  </Link>
                                  {pendingRequestPlayerIds.has(p.id) && (
                                    <Tooltip title={t('team.detail.pendingChangesTooltip')}>
                                      <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} aria-hidden />
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>{formatPlayerBirthDisplay(p.birthDate, p.birthYear)}</TableCell>
                              <TableCell>{age != null ? t('team.detail.yearsOld', { count: age }) : '—'}</TableCell>
                              <TableCell>{p.status === 'unsubscribed' ? t('team.detail.statusDesinscrito') : t('team.detail.statusInscrito')}</TableCell>
                              <TableCell align="right">
                                <IconButton size="small" onClick={() => navigate(`/teams/${id}/players/${p.id}?edit=1`, { state: { from: 'team' as const } })} aria-label={t('team.detail.editPlayer')} disabled={pendingRequestPlayerIds.has(p.id) || p.status === 'unsubscribed'}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                {p.status !== 'unsubscribed' && (
                                  <IconButton size="small" onClick={() => handleRemovePlayerClick(p)} aria-label={t('team.detail.removePlayer')}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={filteredPlayersForList.length}
                    page={playersPage - 1}
                    onPageChange={(_, newPage) => setPlayersPage(newPage + 1)}
                    rowsPerPage={PLAYERS_PAGE_SIZE}
                    rowsPerPageOptions={[PLAYERS_PAGE_SIZE]}
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('team.detail.playersPaginationOf')} ${count}`}
                  />
                </>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlaceIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    {t('team.detail.venues')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setAddVenueOpen(true);
                    setVenueName('');
                    setVenueIsOfficial(true);
                    setVenueError('');
                  }}
                >
                  {t('team.detail.addVenue')}
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {team.tournament?.isSingleVenue
                  ? t('team.detail.venuesDescSingleVenue')
                  : t('team.detail.venuesDesc')}
              </Typography>
              {venues.length === 0 ? (
                <Typography color="text.secondary">{t('team.detail.noVenues')}</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('team.detail.venueName')}</TableCell>
                        <TableCell>{t('team.detail.venueType')}</TableCell>
                        <TableCell sx={{ width: 100 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {venues.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.name}</TableCell>
                          <TableCell>
                            {v.isOfficial ? t('team.detail.venueOfficial') : t('team.detail.venueAlternate')}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditVenue(v)}
                              aria-label={t('team.detail.editVenue')}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveVenue(v.id)}
                              aria-label={t('team.detail.removeVenue')}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  {t('team.detail.technicalStaff.title')}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setAddStaffOpen(true);
                    setStaffFullName('');
                    setStaffIdNumber('');
                    setStaffType('coach');
                    setStaffCoachLicense('');
                    setStaffPhotoFile(null);
                    setStaffError('');
                  }}
                >
                  {t('team.detail.technicalStaff.add')}
                </Button>
              </Box>
              {technicalStaff.length === 0 ? (
                <Typography color="text.secondary">{t('team.detail.technicalStaff.empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('team.detail.technicalStaff.fullName')}</TableCell>
                        <TableCell>{t('team.detail.technicalStaff.idNumber')}</TableCell>
                        <TableCell>{t('team.detail.technicalStaff.type')}</TableCell>
                        <TableCell>{t('team.detail.technicalStaff.coachLicense')}</TableCell>
                        <TableCell sx={{ width: 100 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {technicalStaff.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.fullName}</TableCell>
                          <TableCell>{s.idDocumentNumber}</TableCell>
                          <TableCell>{t(`team.detail.technicalStaff.type.${s.type}`)}</TableCell>
                          <TableCell>{s.coachLicense ?? '—'}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleOpenEditStaff(s)} aria-label={t('team.detail.editVenue')}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleRemoveStaff(s.id)} aria-label={t('team.detail.removeVenue')}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  {t('team.detail.uniforms.title')}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setAddUniformOpen(true);
                    setUniformJersey('');
                    setUniformShorts('');
                    setUniformSocks('');
                    setUniformError('');
                  }}
                >
                  {t('team.detail.uniforms.add')}
                </Button>
              </Box>
              {uniforms.length === 0 ? (
                <Typography color="text.secondary">{t('team.detail.uniforms.empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>{t('team.detail.uniforms.jersey')}</TableCell>
                        <TableCell>{t('team.detail.uniforms.shorts')}</TableCell>
                        <TableCell>{t('team.detail.uniforms.socks')}</TableCell>
                        <TableCell sx={{ width: 100 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uniforms.map((u, idx) => (
                        <TableRow key={u.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: u.jerseyColor || '#ccc', border: '1px solid', borderColor: 'divider' }} />
                              {u.jerseyColor}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: u.shortsColor || '#ccc', border: '1px solid', borderColor: 'divider' }} />
                              {u.shortsColor}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: u.socksColor || '#ccc', border: '1px solid', borderColor: 'divider' }} />
                              {u.socksColor}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleOpenEditUniform(u)} aria-label={t('team.detail.editVenue')}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleRemoveUniform(u.id)} aria-label={t('team.detail.removeVenue')}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Container>
        </Box>

        <Dialog open={addVenueOpen} onClose={() => setAddVenueOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('team.detail.addVenue')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {venueError && <Typography variant="body2" color="error">{venueError}</Typography>}
            <TextField
              label={t('team.detail.venueName')}
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              fullWidth
              required
            />
            <FormControl component="fieldset">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('team.detail.venueType')}</Typography>
              <RadioGroup
                value={String(venueIsOfficial)}
                onChange={(e) => setVenueIsOfficial(e.target.value === 'true')}
                row
              >
                <FormControlLabel
                  value="true"
                  control={<Radio />}
                  label={hasOfficialVenue ? t('team.detail.venueChangeToOfficial') : t('team.detail.venueOfficial')}
                />
                <FormControlLabel value="false" control={<Radio />} label={t('team.detail.venueAlternate')} />
              </RadioGroup>
              <Typography variant="caption" color="text.secondary">
                {t('team.detail.venueTypeHelp')}
              </Typography>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddVenueOpen(false)}>{t('tournament.create.cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleAddVenue}
              disabled={venueSubmitting || !venueName.trim()}
            >
              {venueSubmitting ? t('team.add.submitting') : t('team.detail.addVenue')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={editVenueOpen} onClose={() => setEditVenueOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('team.detail.editVenue')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editVenueError && <Typography variant="body2" color="error">{editVenueError}</Typography>}
            <TextField
              label={t('team.detail.venueName')}
              value={editVenueName}
              onChange={(e) => setEditVenueName(e.target.value)}
              fullWidth
              required
            />
            <FormControl component="fieldset">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('team.detail.venueType')}</Typography>
              <RadioGroup
                value={String(editVenueIsOfficial)}
                onChange={(e) => setEditVenueIsOfficial(e.target.value === 'true')}
                row
              >
                <FormControlLabel
                  value="true"
                  control={<Radio />}
                  label={hasOfficialVenue && !editingVenue?.isOfficial ? t('team.detail.venueChangeToOfficial') : t('team.detail.venueOfficial')}
                />
                <FormControlLabel value="false" control={<Radio />} label={t('team.detail.venueAlternate')} />
              </RadioGroup>
              <Typography variant="caption" color="text.secondary">
                {t('team.detail.venueTypeHelp')}
              </Typography>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditVenueOpen(false)}>{t('tournament.create.cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleEditVenue}
              disabled={editVenueSubmitting || !editVenueName.trim()}
            >
              {editVenueSubmitting ? t('team.add.submitting') : t('team.detail.editVenue')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={addStaffOpen} onClose={() => setAddStaffOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('team.detail.technicalStaff.add')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {staffError && <Typography variant="body2" color="error">{staffError}</Typography>}
            <TextField label={t('team.detail.technicalStaff.fullName')} value={staffFullName} onChange={(e) => setStaffFullName(e.target.value)} fullWidth required />
            <TextField label={t('team.detail.technicalStaff.idNumber')} value={staffIdNumber} onChange={(e) => setStaffIdNumber(e.target.value)} fullWidth required />
            <FormControl fullWidth>
              <InputLabel id="staff-type-label">{t('team.detail.technicalStaff.type')}</InputLabel>
              <Select labelId="staff-type-label" value={staffType} label={t('team.detail.technicalStaff.type')} onChange={(e) => setStaffType(e.target.value as 'coach' | 'assistant' | 'masseur' | 'utilero')}>
                <MenuItem value="coach">{t('team.detail.technicalStaff.type.coach')}</MenuItem>
                <MenuItem value="assistant">{t('team.detail.technicalStaff.type.assistant')}</MenuItem>
                <MenuItem value="masseur">{t('team.detail.technicalStaff.type.masseur')}</MenuItem>
                <MenuItem value="utilero">{t('team.detail.technicalStaff.type.utilero')}</MenuItem>
              </Select>
            </FormControl>
            <TextField label={t('team.detail.technicalStaff.coachLicense')} value={staffCoachLicense} onChange={(e) => setStaffCoachLicense(e.target.value)} fullWidth />
            <Typography variant="subtitle2">{t('team.detail.technicalStaff.photo')}</Typography>
            <Button variant="outlined" component="label" size="small" fullWidth>
              {staffPhotoFile ? staffPhotoFile.name : t('team.detail.attachDocument')}
              <input type="file" accept="image/*" hidden onChange={(e) => setStaffPhotoFile(e.target.files?.[0] ?? null)} />
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddStaffOpen(false)}>{t('tournament.create.cancel')}</Button>
            <Button variant="contained" onClick={handleAddStaff} disabled={staffSubmitting || !staffFullName.trim() || !staffIdNumber.trim()}>
              {staffSubmitting ? t('team.add.submitting') : t('team.detail.technicalStaff.add')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={editStaffOpen} onClose={() => setEditStaffOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('team.detail.technicalStaff.edit')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editStaffError && <Typography variant="body2" color="error">{editStaffError}</Typography>}
            <TextField label={t('team.detail.technicalStaff.fullName')} value={editStaffFullName} onChange={(e) => setEditStaffFullName(e.target.value)} fullWidth required />
            <TextField label={t('team.detail.technicalStaff.idNumber')} value={editStaffIdNumber} onChange={(e) => setEditStaffIdNumber(e.target.value)} fullWidth required />
            <FormControl fullWidth>
              <InputLabel id="edit-staff-type-label">{t('team.detail.technicalStaff.type')}</InputLabel>
              <Select labelId="edit-staff-type-label" value={editStaffType} label={t('team.detail.technicalStaff.type')} onChange={(e) => setEditStaffType(e.target.value as 'coach' | 'assistant' | 'masseur' | 'utilero')}>
                <MenuItem value="coach">{t('team.detail.technicalStaff.type.coach')}</MenuItem>
                <MenuItem value="assistant">{t('team.detail.technicalStaff.type.assistant')}</MenuItem>
                <MenuItem value="masseur">{t('team.detail.technicalStaff.type.masseur')}</MenuItem>
                <MenuItem value="utilero">{t('team.detail.technicalStaff.type.utilero')}</MenuItem>
              </Select>
            </FormControl>
            <TextField label={t('team.detail.technicalStaff.coachLicense')} value={editStaffCoachLicense} onChange={(e) => setEditStaffCoachLicense(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditStaffOpen(false)}>{t('tournament.create.cancel')}</Button>
            <Button variant="contained" onClick={handleEditStaff} disabled={editStaffSubmitting || !editStaffFullName.trim() || !editStaffIdNumber.trim()}>
              {editStaffSubmitting ? t('team.add.submitting') : t('playerProfile.save')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={addUniformOpen} onClose={() => setAddUniformOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('team.detail.uniforms.add')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {uniformError && <Typography variant="body2" color="error">{uniformError}</Typography>}
            <TextField label={t('team.detail.uniforms.jersey')} value={uniformJersey} onChange={(e) => setUniformJersey(e.target.value)} fullWidth required placeholder="#000000 o nombre del color" />
            <TextField label={t('team.detail.uniforms.shorts')} value={uniformShorts} onChange={(e) => setUniformShorts(e.target.value)} fullWidth required />
            <TextField label={t('team.detail.uniforms.socks')} value={uniformSocks} onChange={(e) => setUniformSocks(e.target.value)} fullWidth required />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddUniformOpen(false)}>{t('tournament.create.cancel')}</Button>
            <Button variant="contained" onClick={handleAddUniform} disabled={uniformSubmitting || !uniformJersey.trim() || !uniformShorts.trim() || !uniformSocks.trim()}>
              {uniformSubmitting ? t('team.add.submitting') : t('team.detail.uniforms.add')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={editUniformOpen} onClose={() => setEditUniformOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('team.detail.uniforms.edit')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editUniformError && <Typography variant="body2" color="error">{editUniformError}</Typography>}
            <TextField label={t('team.detail.uniforms.jersey')} value={editUniformJersey} onChange={(e) => setEditUniformJersey(e.target.value)} fullWidth required />
            <TextField label={t('team.detail.uniforms.shorts')} value={editUniformShorts} onChange={(e) => setEditUniformShorts(e.target.value)} fullWidth required />
            <TextField label={t('team.detail.uniforms.socks')} value={editUniformSocks} onChange={(e) => setEditUniformSocks(e.target.value)} fullWidth required />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditUniformOpen(false)}>{t('tournament.create.cancel')}</Button>
            <Button variant="contained" onClick={handleEditUniform} disabled={editUniformSubmitting || !editUniformJersey.trim() || !editUniformShorts.trim() || !editUniformSocks.trim()}>
              {editUniformSubmitting ? t('team.add.submitting') : t('playerProfile.save')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={addPlayerOpen} onClose={() => setAddPlayerOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('team.detail.addPlayer')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && <Typography variant="body2" color="error">{error}</Typography>}
            <TextField label={t('team.detail.firstName')} value={playerFirstName} onChange={(e) => setPlayerFirstName(e.target.value)} fullWidth />
            <TextField label={t('team.detail.lastName')} value={playerLastName} onChange={(e) => setPlayerLastName(e.target.value)} fullWidth />
            <BirthDateSelects
              day={playerBirthDay}
              month={playerBirthMonth}
              year={playerBirthYear}
              onDay={setPlayerBirthDay}
              onMonth={setPlayerBirthMonth}
              onYear={setPlayerBirthYear}
              t={t}
              labelIdPrefix="add-player"
              showSectionTitle
            />
            {hasPrimaryAgeCategories && (
              <>
                <FormControl fullWidth>
                  <InputLabel id="add-player-age-category-label">{t('team.detail.ageCategory')}</InputLabel>
                  <Select labelId="add-player-age-category-label" value={playerCategoryId} label={t('team.detail.ageCategory')} onChange={(e) => setPlayerCategoryId(e.target.value)}>
                    <MenuItem value="">{t('tournament.create.categoryType.none')}</MenuItem>
                    {primaryAgeCategories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name} ({c.minBirthYear}-{c.maxBirthYear})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            <DocumentTypeSelect
              value={playerIdDocumentType}
              onChange={setPlayerIdDocumentType}
              t={t}
              labelId="add-id-type-label"
            />
            <TextField label={t('team.detail.idDocumentNumber')} value={playerIdDocumentNumber} onChange={(e) => setPlayerIdDocumentNumber(e.target.value)} fullWidth size="small" />
            {!isPlayerMinor(buildBirthDateFromParts(playerBirthDay, playerBirthMonth, playerBirthYear) ?? undefined) && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('team.detail.guardianSection')}</Typography>
                <TextField label={t('team.detail.guardianName')} value={playerGuardianName} onChange={(e) => setPlayerGuardianName(e.target.value)} fullWidth size="small" />
                <GuardianRelationSelect
                  value={playerGuardianRelation}
                  onChange={setPlayerGuardianRelation}
                  t={t}
                  labelId="add-guardian-relation-label"
                />
                <TextField label={t('team.detail.guardianIdNumber')} value={playerGuardianIdNumber} onChange={(e) => setPlayerGuardianIdNumber(e.target.value)} fullWidth size="small" />
                <TextField label={t('team.detail.guardianPhone')} value={playerGuardianPhone} onChange={(e) => setPlayerGuardianPhone(e.target.value)} fullWidth size="small" />
                <TextField label={t('team.detail.guardianEmail')} type="email" value={playerGuardianEmail} onChange={(e) => setPlayerGuardianEmail(e.target.value)} fullWidth size="small" />
              </>
            )}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('team.detail.playerPhoto')}</Typography>
            <FileUploadButton
              label={t('team.detail.attachDocument')}
              selectedFileName={playerPhotoFile?.name}
              accept="image/*"
              onChange={setPlayerPhotoFile}
            />
            <Typography variant="subtitle2">{t('team.detail.documentsSection')}</Typography>
            <FileUploadButton
              label={t('team.detail.documentPlayerId')}
              selectedFileName={playerDocIdFile?.name}
              accept=".pdf,.doc,.docx,image/*"
              onChange={setPlayerDocIdFile}
            />
            <FileUploadButton
              label={t('team.detail.documentBirthCertificate')}
              selectedFileName={playerDocBirthFile?.name}
              accept=".pdf,.doc,.docx,image/*"
              onChange={setPlayerDocBirthFile}
            />
            {!isPlayerMinor(buildBirthDateFromParts(playerBirthDay, playerBirthMonth, playerBirthYear) ?? undefined) && (
              <FileUploadButton
                label={t('team.detail.documentGuardianId')}
                selectedFileName={playerDocGuardianFile?.name}
                accept=".pdf,.doc,.docx,image/*"
                onChange={setPlayerDocGuardianFile}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddPlayerOpen(false)}>{t('tournament.create.cancel')}</Button>
            <Button variant="contained" onClick={handleAddPlayer} disabled={submitting || (!playerFirstName.trim() && !playerLastName.trim())}>
              {submitting ? t('team.add.submitting') : t('team.detail.addPlayer')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={!!deleteConfirmPlayer} onClose={() => setDeleteConfirmPlayer(null)}>
          <DialogTitle>{t('team.detail.removePlayer')}</DialogTitle>
          <DialogContent>
            <Typography>{t('team.detail.removePlayerConfirm')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmPlayer(null)}>{t('tournament.create.cancel')}</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleRemovePlayerConfirm}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? t('team.add.submitting') : t('team.detail.removePlayer')}
            </Button>
          </DialogActions>
        </Dialog>

        <TeamRosterPdfDialog
          open={rosterPdfOpen}
          onClose={() => setRosterPdfOpen(false)}
          team={team}
          categoryName={rosterPdfCategoryName}
          ageCategories={team?.tournament?.ageCategories ?? undefined}
        />
      </Box>
    </ThemeProvider>
  );
};
