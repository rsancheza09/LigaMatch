import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme, heroGradient } from '@shared/theme';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ImageIcon from '@mui/icons-material/Image';
import PaletteIcon from '@mui/icons-material/Palette';
import PublicIcon from '@mui/icons-material/Public';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import { createTournament } from '@shared/api/tournaments';
import { getTodayLocalDateString } from '@shared/utils/dateUtils';
import type { RootState } from '@shared/store';
import type { AgeCategory, CategoryType } from '@shared/store/slices/tournamentSlice';
import {
  addAgeCategory as addAgeCategoryAction,
  removeAgeCategory as removeAgeCategoryAction,
  resetTournament,
  setCategoryType,
  setDescription,
  setEndDate,
  setIsSingleVenue,
  setLocation,
  setName,
  setSport,
  setStartDate,
  setTournamentType,
  setVenueName,
  updateAgeCategory as updateAgeCategoryAction,
} from '@shared/store/slices/tournamentSlice';

const theme = appTheme;

const SPORTS = [
  { value: 'soccer', labelKey: 'soccer' },
  { value: 'futsal', labelKey: 'futsal' },
] as const;

const ProBadge = () => (
  <Chip
    label="PRO"
    size="small"
    sx={{ ml: 1, fontWeight: 700, background: heroGradient, color: 'white', fontSize: '0.7rem' }}
  />
);

export type CreateTournamentPageProps = {
  embedded?: boolean;
  onClose?: () => void;
};

export const CreateTournamentPage = (props: CreateTournamentPageProps = {}) => {
  const { embedded = false, onClose } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    sport,
    categoryType,
    ageCategories,
    name,
    description,
    startDate,
    endDate,
    location,
    isSingleVenue,
    venueName,
  } = useSelector((state: RootState) => state.tournament);

  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userPlan = useSelector((state: RootState) => state.auth.user?.plan || 'free');
  const isPro = userPlan === 'pro' || userPlan === 'fullPro';
  const showProBadge = isLoggedIn && !isPro;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (startDate === '') dispatch(setStartDate(getTodayLocalDateString()));
    if (endDate === '') dispatch(setEndDate(getTodayLocalDateString()));
  }, [dispatch, startDate, endDate]);

  useEffect(() => {
    if (categoryType === 'subcategories') dispatch(setCategoryType('none'));
  }, [categoryType, dispatch]);

  useEffect(() => {
    dispatch(setTournamentType(categoryType === 'ages' ? 'ages' : 'open'));
  }, [categoryType, dispatch]);

  const addAgeCategory = useCallback(() => {
    dispatch(addAgeCategoryAction());
  }, [dispatch]);

  const removeAgeCategory = useCallback(
    (id: string) => {
      dispatch(removeAgeCategoryAction(id));
    },
    [dispatch]
  );

  const updateAgeCategory = useCallback(
    (id: string, field: keyof AgeCategory, value: string | number) => {
      dispatch(updateAgeCategoryAction({ id, field, value }));
    },
    [dispatch]
  );

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoggedIn) {
        navigate('/register', { state: { from: '/dashboard' } });
        return;
      }
      setSubmitError('');
      setSubmitting(true);
      try {
        await createTournament({
          sport,
          categoryType: categoryType === 'subcategories' ? 'none' : categoryType,
          tournamentType: categoryType === 'ages' ? 'ages' : 'open',
          name,
          description: description || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          location: location || undefined,
          isSingleVenue,
          venueName: isSingleVenue && venueName.trim() ? venueName.trim() : undefined,
          ageCategories:
            categoryType === 'ages'
              ? ageCategories.map((c) => ({
                  name: c.name,
                  minBirthYear: c.minBirthYear,
                  maxBirthYear: c.maxBirthYear,
                }))
              : undefined,
        });
        dispatch(resetTournament());
        if (embedded && onClose) onClose();
        else navigate('/');
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : t('tournament.create.error')
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      isLoggedIn,
      navigate,
      dispatch,
      sport,
      categoryType,
      ageCategories,
      name,
      description,
      startDate,
      endDate,
      location,
      isSingleVenue,
      venueName,
      t,
      embedded,
      onClose,
    ]
  );

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: embedded ? undefined : '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!embedded && (
          <AppBar
            title={t('tournament.create.title')}
            showBackButton
            onBackClick={() => navigate('/')}
            backAriaLabel={t('tournament.create.back')}
          />
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            py: { xs: 4, md: 6 },
            background:
              'linear-gradient(180deg, rgba(21,101,192,0.08) 0%, rgba(255,255,255,0) 30%)',
          }}
        >
          <Container maxWidth="md">
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
                <EmojiEventsIcon
                  sx={{ color: 'secondary.main', fontSize: 36 }}
                />
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {t('tournament.create.title')}
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleSubmit}>
                {/* Sport selection */}
                <Card
                  elevation={0}
                  sx={{
                    mb: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {t('tournament.create.sport.title')}
                    </Typography>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                      <InputLabel>{t('tournament.create.sport.select')}</InputLabel>
                      <Select
                        value={sport}
                        label={t('tournament.create.sport.select')}
                        onChange={(e) => dispatch(setSport(e.target.value))}
                        required
                      >
                        {SPORTS.map(({ value, labelKey }) => (
                          <MenuItem key={value} value={value}>
                            {t(`tournament.create.sport.options.${labelKey}`)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>

                {/* Category type */}
                <Card
                  elevation={0}
                  sx={{
                    mb: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {t('tournament.create.categoryType.title')}
                    </Typography>
                    <FormControl component="fieldset" sx={{ mt: 1, width: '100%' }}>
                      <RadioGroup
                        value={categoryType}
                        onChange={(e) =>
                          dispatch(setCategoryType(e.target.value as CategoryType))
                        }
                      >
                        <FormControlLabel
                          value="none"
                          control={<Radio />}
                          label={t('tournament.create.categoryType.none')}
                        />
                        <FormControlLabel
                          value="ages"
                          control={<Radio />}
                          label={t('tournament.create.categoryType.ages')}
                        />
                      </RadioGroup>
                    </FormControl>

                    {/* Age categories */}
                    {categoryType === 'ages' && (
                      <Box sx={{ mt: 3 }}>
                        <FormLabel sx={{ mb: 2, display: 'block' }}>
                          {t('tournament.create.ageCategories.title')}
                        </FormLabel>
                        {ageCategories.map((cat) => (
                          <Box
                            key={cat.id}
                            sx={{
                              display: 'flex',
                              gap: 2,
                              alignItems: 'flex-start',
                              mb: 2,
                              flexWrap: 'wrap',
                            }}
                          >
                            <TextField
                              label={t('tournament.create.ageCategories.name')}
                              value={cat.name}
                              onChange={(e) =>
                                updateAgeCategory(cat.id, 'name', e.target.value)
                              }
                              size="small"
                              sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}
                            />
                            <TextField
                              label={t('tournament.create.ageCategories.minBirthYear')}
                              type="number"
                              value={cat.minBirthYear || ''}
                              onChange={(e) =>
                                updateAgeCategory(
                                  cat.id,
                                  'minBirthYear',
                                  Number(e.target.value) || 0
                                )
                              }
                              inputProps={{ min: 1900, max: currentYear }}
                              size="small"
                              sx={{ flex: { xs: '1 1 80px', sm: '0 0 100px' } }}
                            />
                            <TextField
                              label={t('tournament.create.ageCategories.maxBirthYear')}
                              type="number"
                              value={cat.maxBirthYear || ''}
                              onChange={(e) =>
                                updateAgeCategory(
                                  cat.id,
                                  'maxBirthYear',
                                  Number(e.target.value) || 0
                                )
                              }
                              inputProps={{ min: 1900, max: currentYear }}
                              size="small"
                              sx={{ flex: { xs: '1 1 80px', sm: '0 0 100px' } }}
                            />
                            <IconButton
                              color="error"
                              onClick={() => removeAgeCategory(cat.id)}
                              disabled={ageCategories.length <= 1}
                              aria-label={t('tournament.create.ageCategories.remove')}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        ))}
                        <Button
                          startIcon={<AddIcon />}
                          onClick={addAgeCategory}
                          variant="outlined"
                          size="small"
                        >
                          {t('tournament.create.ageCategories.add')}
                        </Button>
                      </Box>
                    )}

                  </CardContent>
                </Card>

                {/* General data */}
                <Card
                  elevation={0}
                  sx={{
                    mb: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {t('tournament.create.general.title')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                      <TextField
                        label={t('tournament.create.general.name')}
                        value={name}
                        onChange={(e) => dispatch(setName(e.target.value))}
                        required
                        fullWidth
                      />
                      <TextField
                        label={t('tournament.create.general.description')}
                        value={description}
                        onChange={(e) => dispatch(setDescription(e.target.value))}
                        multiline
                        rows={3}
                        fullWidth
                      />
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 2,
                        }}
                      >
                        <TextField
                          label={t('tournament.create.general.startDate')}
                          type="date"
                          value={startDate}
                          onChange={(e) => dispatch(setStartDate(e.target.value))}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />
                        <TextField
                          label={t('tournament.create.general.endDate')}
                          type="date"
                          value={endDate}
                          onChange={(e) => dispatch(setEndDate(e.target.value))}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />
                      </Box>
                      <TextField
                        label={t('tournament.create.general.location')}
                        value={location}
                        onChange={(e) => dispatch(setLocation(e.target.value))}
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSingleVenue}
                            onChange={(e) => dispatch(setIsSingleVenue(e.target.checked))}
                          />
                        }
                        label={t('tournament.create.singleVenue')}
                      />
                      {isSingleVenue && (
                        <TextField
                          label={t('tournament.create.singleVenueName')}
                          value={venueName}
                          onChange={(e) => dispatch(setVenueName(e.target.value))}
                          fullWidth
                          placeholder={t('tournament.detail.singleVenueDesc')}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {isSingleVenue
                          ? t('tournament.detail.singleVenueDesc')
                          : t('tournament.create.venuesRequiredDesc')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* PRO sections */}
                <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, opacity: isPro ? 1 : 0.7 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      {t('tournament.pro.title')}
                      {showProBadge && <ProBadge />}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ImageIcon color={isPro ? 'primary' : 'disabled'} />
                        <Typography variant="body2" color="text.secondary">
                          {t('tournament.pro.logo')}
                        </Typography>
                        {showProBadge && <ProBadge />}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PublicIcon color={isPro ? 'primary' : 'disabled'} />
                        <Typography variant="body2" color="text.secondary">
                          {t('tournament.pro.makePublic')}
                        </Typography>
                        {showProBadge && <ProBadge />}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PaletteIcon color={isPro ? 'primary' : 'disabled'} />
                        <Typography variant="body2" color="text.secondary">
                          {t('tournament.pro.customColors')}
                        </Typography>
                        {showProBadge && <ProBadge />}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {submitError && (
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {submitError}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => (embedded && onClose ? onClose() : navigate('/'))} disabled={submitting}>
                    {t('tournament.create.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                    sx={{
                      bgcolor: 'secondary.main',
                      '&:hover': { bgcolor: 'secondary.dark' },
                    }}
                  >
                    {submitting ? t('tournament.create.submitting') : t('tournament.create.submit')}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
