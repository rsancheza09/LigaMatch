import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from '@shared/theme';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PersonIcon from '@mui/icons-material/Person';

import { DEFAULT_PERSON_IMAGE_URL } from '@shared/constants/defaultPersonImage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import {
  getTeam,
  listTeamPlayerChangeRequests,
  resendPlayerChangeRequestNotification,
  updatePlayer,
  uploadPlayerFile,
} from '@shared/api/teams';
import type { Player, Team } from '@shared/api/teams';
import {
  buildBirthDateFromParts,
  formatBirthDateMMDDYYYY,
  getAgeFromBirthDate,
  isPlayerMinor,
  parseBirthDateParts,
} from '@shared/utils/dateUtils';
import { fileToBase64 } from '@shared/utils/fileUtils';
import { formatGuardianRelationLabel, formatIdDocumentTypeLabel } from '@shared/utils/playerFormUtils';
import { BirthDateSelects } from '@components/BirthDateSelects';
import { DocumentTypeSelect } from '@components/DocumentTypeSelect';
import { FileUploadButton } from '@components/FileUploadButton';
import { GuardianRelationSelect } from '@components/GuardianRelationSelect';

const theme = appTheme;

type FieldKey =
  | 'firstName'
  | 'lastName'
  | 'birthDate'
  | 'categoryId'
  | 'idDocumentType'
  | 'idDocumentNumber'
  | 'guardianName'
  | 'guardianRelation'
  | 'guardianIdNumber'
  | 'guardianPhone'
  | 'guardianEmail';

function getInitialValues(p: Player) {
  return {
    firstName: p.firstName ?? '',
    lastName: p.lastName ?? '',
    birthDate: p.birthDate ?? '',
    categoryId: p.tournamentAgeCategoryId ?? '',
    idDocumentType: p.idDocumentType ?? '',
    idDocumentNumber: p.idDocumentNumber ?? '',
    guardianName: p.guardianName ?? '',
    guardianRelation: p.guardianRelation ?? '',
    guardianIdNumber: p.guardianIdNumber ?? '',
    guardianPhone: p.guardianPhone ?? '',
    guardianEmail: p.guardianEmail ?? '',
  };
}

function computeChangedFields(
  initial: ReturnType<typeof getInitialValues>,
  current: ReturnType<typeof getInitialValues>
): Set<FieldKey> {
  const changed = new Set<FieldKey>();
  (Object.keys(initial) as FieldKey[]).forEach((key) => {
    const a = String(initial[key] ?? '');
    const b = String(current[key] ?? '');
    if (a !== b) changed.add(key);
  });
  return changed;
}

export const PlayerProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>();
  const [searchParams] = useSearchParams();
  const startEdit = searchParams.get('edit') === '1';

  const navState = location.state as
    | { from?: 'playersSection' | 'team'; playersSectionTournamentId?: string | null; playersSectionTeamId?: string | null }
    | undefined
    | null;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(startEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [resendSubmitting, setResendSubmitting] = useState(false);

  const player = useMemo(() => {
    if (!team?.players || !playerId) return null;
    return team.players.find((p) => p.id === playerId) ?? null;
  }, [team, playerId]);

  const isTournamentAdmin = team?.isTournamentAdmin ?? false;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState<number | ''>('');
  const [birthMonth, setBirthMonth] = useState<number | ''>('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [idDocumentType, setIdDocumentType] = useState('');
  const [idDocumentNumber, setIdDocumentNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianIdNumber, setGuardianIdNumber] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>>([]);
  const [docIdFile, setDocIdFile] = useState<File | null>(null);
  const [docBirthFile, setDocBirthFile] = useState<File | null>(null);
  const [docGuardianFile, setDocGuardianFile] = useState<File | null>(null);

  const initialValues = useMemo(() => (player ? getInitialValues(player) : null), [player]);
  const currentValues = useMemo(
    () =>
      initialValues
        ? {
            ...initialValues,
            firstName,
            lastName,
            birthDate: buildBirthDateFromParts(birthDay, birthMonth, birthYear) ?? '',
            categoryId,
            idDocumentType,
            idDocumentNumber,
            guardianName,
            guardianRelation,
            guardianIdNumber,
            guardianPhone,
            guardianEmail,
          }
        : null,
    [
      initialValues,
      firstName,
      lastName,
      birthDay,
      birthMonth,
      birthYear,
      categoryId,
      idDocumentType,
      idDocumentNumber,
      guardianName,
      guardianRelation,
      guardianIdNumber,
      guardianPhone,
      guardianEmail,
    ]
  );
  const changedFields = useMemo(() => {
    if (!initialValues || !currentValues) return new Set<FieldKey>();
    return computeChangedFields(initialValues, currentValues);
  }, [initialValues, currentValues]);
  const hasDocumentChanges = docIdFile !== null || docBirthFile !== null || docGuardianFile !== null;
  const showApprovalMessage = editMode && !isTournamentAdmin && (changedFields.size > 0 || hasDocumentChanges || photoFile !== null);

  const loadTeam = useCallback(() => {
    if (!teamId) return;
    getTeam(teamId)
      .then(setTeam)
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(loadTeam, [loadTeam]);

  useEffect(() => {
    if (!teamId || !playerId || !team || team.isTournamentAdmin) {
      setPendingRequestId(null);
      return;
    }
    listTeamPlayerChangeRequests(teamId, 'pending')
      .then((list) => {
        const forThisPlayer = list.find((r) => r.playerId === playerId);
        const requestId = forThisPlayer?.id ?? null;
        setPendingRequestId(requestId);
        if (requestId) setEditMode(false);
      })
      .catch(() => setPendingRequestId(null));
  }, [teamId, playerId, team]);

  useEffect(() => {
    if (player) {
      const init = getInitialValues(player);
      setFirstName(init.firstName);
      setLastName(init.lastName);
      const parts = parseBirthDateParts(player.birthDate ?? '');
      if (parts) {
        setBirthDay(parts.day);
        setBirthMonth(parts.month);
        setBirthYear(parts.year);
      } else {
        setBirthDay('');
        setBirthMonth('');
        setBirthYear('');
      }
      setCategoryId(init.categoryId);
      setIdDocumentType(init.idDocumentType);
      setIdDocumentNumber(init.idDocumentNumber);
      setGuardianName(init.guardianName);
      setGuardianRelation(init.guardianRelation);
      setGuardianIdNumber(init.guardianIdNumber);
      setGuardianPhone(init.guardianPhone);
      setGuardianEmail(init.guardianEmail);
      setPhotoUrl(player.photoUrl ?? null);
      setPhotoFile(null);
      setDocuments(player.documents ?? []);
      setDocIdFile(null);
      setDocBirthFile(null);
      setDocGuardianFile(null);
    }
  }, [player]);

  const handleBack = useCallback(() => {
    if (navState?.from === 'playersSection') {
      navigate('/dashboard', {
        state: {
          section: 'players' as const,
          playersSectionTournamentId: navState.playersSectionTournamentId ?? null,
          playersSectionTeamId: navState.playersSectionTeamId ?? null,
        },
      });
    } else {
      navigate('/dashboard', { state: { section: 'teams' as const, selectedTeamId: teamId ?? null } });
    }
  }, [navigate, navState?.from, navState?.playersSectionTournamentId, navState?.playersSectionTeamId, teamId]);

  const handleSave = async () => {
    if (!teamId || !playerId) return;
    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    try {
      let newPhotoUrl: string | null = photoUrl;
      if (photoFile) {
        const b64 = await fileToBase64(photoFile);
        const res = await uploadPlayerFile(teamId, 'photo', b64, photoFile.name, photoFile.type);
        newPhotoUrl = res.url;
      }
      const docs = [...documents];
      if (docIdFile) {
        const b64 = await fileToBase64(docIdFile);
        const res = await uploadPlayerFile(teamId, 'player_id_copy', b64, docIdFile.name, docIdFile.type);
        docs.push({ documentType: 'player_id_copy', fileUrl: res.url, fileName: res.fileName, mimeType: res.mimeType });
      }
      if (docBirthFile) {
        const b64 = await fileToBase64(docBirthFile);
        const res = await uploadPlayerFile(teamId, 'birth_certificate', b64, docBirthFile.name, docBirthFile.type);
        docs.push({ documentType: 'birth_certificate', fileUrl: res.url, fileName: res.fileName, mimeType: res.mimeType });
      }
      if (docGuardianFile) {
        const b64 = await fileToBase64(docGuardianFile);
        const res = await uploadPlayerFile(teamId, 'guardian_id_copy', b64, docGuardianFile.name, docGuardianFile.type);
        docs.push({ documentType: 'guardian_id_copy', fileUrl: res.url, fileName: res.fileName, mimeType: res.mimeType });
      }
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || player?.name || '';
      const builtBirthDate = buildBirthDateFromParts(birthDay, birthMonth, birthYear);
      const result = await updatePlayer(teamId, playerId, {
        name: name || undefined,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        birthYear: birthYear !== '' ? Number(birthYear) : undefined,
        birthDate: builtBirthDate ?? null,
        tournamentAgeCategoryId: categoryId || null,
        idDocumentType: idDocumentType || null,
        idDocumentNumber: idDocumentNumber || null,
        guardianName: guardianName.trim() || null,
        guardianRelation: guardianRelation || null,
        guardianIdNumber: guardianIdNumber.trim() || null,
        guardianPhone: guardianPhone.trim() || null,
        guardianEmail: guardianEmail.trim() || null,
        photoUrl: newPhotoUrl,
        documents: docs.length ? docs : undefined,
      });
      setEditMode(false);
      setPhotoUrl(newPhotoUrl);
      setPhotoFile(null);
      setDocuments(docs);
      setDocIdFile(null);
      setDocBirthFile(null);
      setDocGuardianFile(null);
      if (result && 'status' in result && result.status === 'pending') {
        setSuccessMessage(t('playerProfile.changesRequireApproval'));
        if (result && typeof result === 'object' && 'id' in result && typeof (result as { id: string }).id === 'string') {
          setPendingRequestId((result as { id: string }).id);
        }
      } else {
        loadTeam();
        setSuccessMessage(t('playerProfile.saved'));
        setPendingRequestId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const highlightSx = (field: FieldKey) =>
    showApprovalMessage && changedFields.has(field)
      ? { backgroundColor: 'warning.light', border: '1px solid', borderColor: 'warning.main', borderRadius: 1 }
      : undefined;

  const ageCategories = team?.tournament?.ageCategories ?? [];
  const hasAgeCategories = (team?.tournament?.categoryType === 'ages' && ageCategories.length) > 0;
  const birthDateForAge = buildBirthDateFromParts(birthDay, birthMonth, birthYear);
  const showGuardianSection = !isPlayerMinor(birthDateForAge ?? undefined);
  const playerAge = getAgeFromBirthDate(birthDateForAge ?? undefined, birthYear !== '' ? birthYear : undefined);

  if (loading || !team) {
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

  if (!player) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">{t('tournament.detail.notFound')}</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || player.name;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          title={editMode ? t('playerProfile.editTitle') : displayName}
          showBackButton
          onBackClick={handleBack}
          backAriaLabel={t('tournament.create.back')}
        />
        <Box component="main" sx={{ flex: 1, py: 4 }}>
          <Container maxWidth="md">
            {successMessage && (
              <Alert severity="info" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            {showApprovalMessage && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('playerProfile.changesRequireApproval')}
              </Alert>
            )}
            {!isTournamentAdmin && pendingRequestId && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<NotificationsActiveIcon />}
                    disabled={resendSubmitting}
                    onClick={async () => {
                      if (!pendingRequestId) return;
                      setResendSubmitting(true);
                      try {
                        await resendPlayerChangeRequestNotification(pendingRequestId);
                        setSuccessMessage(t('playerProfile.resendNotificationSent'));
                      } catch {
                        setError(t('playerProfile.resendNotification') + ': failed');
                      } finally {
                        setResendSubmitting(false);
                      }
                    }}
                  >
                    {resendSubmitting ? t('team.add.submitting') : t('playerProfile.resendNotification')}
                  </Button>
                }
              >
                {t('playerProfile.pendingChangesBanner')}
              </Alert>
            )}

            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    {t('playerProfile.title')}
                  </Typography>
                </Box>
                {!editMode ? (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                    disabled={!!pendingRequestId}
                    title={pendingRequestId ? t('playerProfile.editDisabledPending') : undefined}
                  >
                    {t('team.detail.editPlayer')}
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" size="small" onClick={() => setEditMode(false)}>
                      {t('playerProfile.cancel')}
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSave}
                      disabled={submitting || (!firstName.trim() && !lastName.trim())}
                    >
                      {submitting ? t('team.add.submitting') : t('playerProfile.save')}
                    </Button>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {editMode ? (
                  <>
                    <TextField
                      label={t('team.detail.firstName')}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      fullWidth
                      size="small"
                      sx={highlightSx('firstName')}
                    />
                    <TextField
                      label={t('team.detail.lastName')}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      fullWidth
                      size="small"
                      sx={highlightSx('lastName')}
                    />
                    <BirthDateSelects
                      day={birthDay}
                      month={birthMonth}
                      year={birthYear}
                      onDay={setBirthDay}
                      onMonth={setBirthMonth}
                      onYear={setBirthYear}
                      t={t}
                      labelIdPrefix="profile"
                      selectSx={highlightSx('birthDate')}
                      showSectionTitle
                    />
                    {hasAgeCategories && (
                      <>
                        <FormControl fullWidth size="small" sx={highlightSx('categoryId')}>
                          <InputLabel id="profile-age-category">{t('team.detail.ageCategory')}</InputLabel>
                          <Select
                            labelId="profile-age-category"
                            value={categoryId}
                            label={t('team.detail.ageCategory')}
                            onChange={(e) => setCategoryId(e.target.value)}
                          >
                            <MenuItem value="">{t('tournament.create.categoryType.none')}</MenuItem>
                            {ageCategories.map((c) => (
                              <MenuItem key={c.id} value={c.id}>
                                {c.name} ({c.minBirthYear}-{c.maxBirthYear})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </>
                    )}
                    <DocumentTypeSelect
                      value={idDocumentType}
                      onChange={setIdDocumentType}
                      t={t}
                      labelId="profile-id-type"
                      sx={highlightSx('idDocumentType')}
                    />
                    <TextField
                      label={t('team.detail.idDocumentNumber')}
                      value={idDocumentNumber}
                      onChange={(e) => setIdDocumentNumber(e.target.value)}
                      fullWidth
                      size="small"
                      sx={highlightSx('idDocumentNumber')}
                    />
                    {showGuardianSection && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>
                          {t('team.detail.guardianSection')}
                        </Typography>
                        <TextField
                          label={t('team.detail.guardianName')}
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          fullWidth
                          size="small"
                          sx={highlightSx('guardianName')}
                        />
                        <GuardianRelationSelect
                          value={guardianRelation}
                          onChange={setGuardianRelation}
                          t={t}
                          labelId="profile-guardian-relation"
                          sx={highlightSx('guardianRelation')}
                        />
                        <TextField
                          label={t('team.detail.guardianIdNumber')}
                          value={guardianIdNumber}
                          onChange={(e) => setGuardianIdNumber(e.target.value)}
                          fullWidth
                          size="small"
                          sx={highlightSx('guardianIdNumber')}
                        />
                        <TextField
                          label={t('team.detail.guardianPhone')}
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          fullWidth
                          size="small"
                          sx={highlightSx('guardianPhone')}
                        />
                        <TextField
                          label={t('team.detail.guardianEmail')}
                          type="email"
                          value={guardianEmail}
                          onChange={(e) => setGuardianEmail(e.target.value)}
                          fullWidth
                          size="small"
                          sx={highlightSx('guardianEmail')}
                        />
                      </>
                    )}
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      {t('team.detail.playerPhoto')}
                    </Typography>
                    <FileUploadButton
                      label={t('team.detail.attachDocument')}
                      selectedFileName={photoFile?.name}
                      accept="image/*"
                      onChange={setPhotoFile}
                    />
                    <Typography variant="subtitle2">{t('team.detail.documentsSection')}</Typography>
                    <FileUploadButton
                      label={t('team.detail.documentPlayerId')}
                      selectedFileName={docIdFile?.name}
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={setDocIdFile}
                    />
                    <FileUploadButton
                      label={t('team.detail.documentBirthCertificate')}
                      selectedFileName={docBirthFile?.name}
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={setDocBirthFile}
                    />
                    {showGuardianSection && (
                      <FileUploadButton
                        label={t('team.detail.documentGuardianId')}
                        selectedFileName={docGuardianFile?.name}
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={setDocGuardianFile}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <Avatar
                        src={photoUrl ?? player.photoUrl ?? DEFAULT_PERSON_IMAGE_URL}
                        sx={{ width: 120, height: 120, bgcolor: 'action.hover' }}
                      >
                        <PersonIcon sx={{ fontSize: 56 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {t('team.detail.firstName')}
                        </Typography>
                        <Typography variant="body1">{firstName || '—'}</Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                          {t('team.detail.lastName')}
                        </Typography>
                        <Typography variant="body1">{lastName || '—'}</Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                          {t('team.detail.birthDate')}
                        </Typography>
                        <Typography variant="body1">
                          {formatBirthDateMMDDYYYY(buildBirthDateFromParts(birthDay, birthMonth, birthYear) ?? '') || '—'}
                        </Typography>
                        {playerAge != null && (
                          <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                              {t('team.detail.age')}
                            </Typography>
                            <Typography variant="body1">{t('team.detail.yearsOld', { count: playerAge })}</Typography>
                          </>
                        )}
                        {hasAgeCategories && (
                          <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                              {t('team.detail.ageCategory')}
                            </Typography>
                            <Typography variant="body1">
                              {categoryId ? ageCategories.find((c) => c.id === categoryId)?.name ?? '—' : '—'}
                            </Typography>
                          </>
                        )}
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                          {t('team.detail.idDocumentType')}
                        </Typography>
                        <Typography variant="body1">
                          {formatIdDocumentTypeLabel(idDocumentType, t)}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                          {t('team.detail.idDocumentNumber')}
                        </Typography>
                        <Typography variant="body1">{idDocumentNumber || '—'}</Typography>
                      </Box>
                    </Box>
                    {showGuardianSection && (
                      <>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                          {t('team.detail.guardianSection')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {t('team.detail.guardianName')}
                            </Typography>
                            <Typography variant="body2">{guardianName || '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {t('team.detail.guardianRelation')}
                            </Typography>
                            <Typography variant="body2">
                              {formatGuardianRelationLabel(guardianRelation, t)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {t('team.detail.guardianIdNumber')}
                            </Typography>
                            <Typography variant="body2">{guardianIdNumber || '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {t('team.detail.guardianPhone')}
                            </Typography>
                            <Typography variant="body2">{guardianPhone || '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {t('team.detail.guardianEmail')}
                            </Typography>
                            <Typography variant="body2">{guardianEmail || '—'}</Typography>
                          </Box>
                        </Box>
                      </>
                    )}
                    {documents.length > 0 && (
                      <>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                          {t('team.detail.documentsSection')}
                        </Typography>
                        <Typography variant="body2">
                          {documents.map((d) => d.fileName || d.documentType).join(', ')}
                        </Typography>
                      </>
                    )}
                  </>
                )}
              </Box>
            </Paper>

            <Box sx={{ mt: 2 }}>
              <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ textTransform: 'none' }}>
                {navState?.from === 'playersSection' ? t('playerProfile.backToPlayersList') : t('playerProfile.backToTeam')}
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
