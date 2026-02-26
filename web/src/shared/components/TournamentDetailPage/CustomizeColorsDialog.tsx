import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import ColorPicker from 'react-best-gradient-color-picker';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PublicTournamentView } from './PublicTournamentView';
import type { Match } from '@shared/api/matches';
import {
  uploadTournamentBackground,
  uploadTournamentLogo,
  type StandingRow,
  type StandingsByGroup,
  type Tournament,
} from '@shared/api/tournaments';

const DEFAULT_PRIMARY = '#0277BD';
const DEFAULT_SECONDARY = '#FF8F00';
const DEFAULT_BG = '#f8fafc';
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

const SECTION_IDS = ['matches', 'standings', 'topScorers', 'cards'] as const;

function ColorPickerField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = value.startsWith('#') ? value : `#${value}`;
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(normalized);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: isValidHex ? normalized : '#ccc',
          border: '2px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          flexShrink: 0,
          '&:hover': { borderColor: 'primary.main' },
        }}
      />
      <input
        ref={inputRef}
        type="color"
        value={isValidHex ? normalized : '#0277BD'}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
      <TextField
        label={label}
        value={value}
        onChange={(e) => {
          let v = e.target.value.trim();
          if (v === '') {
            onChange('');
            return;
          }
          if (!v.startsWith('#')) v = '#' + v;
          if (v.length <= 7) onChange(v);
        }}
        size="small"
        placeholder={placeholder ?? '#0277BD'}
        sx={{ flex: 1, minWidth: 120 }}
        inputProps={{ maxLength: 7 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: isValidHex ? normalized : 'transparent', border: '1px solid', borderColor: 'divider' }} />
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
}

function SortableSectionItem({ id, label, onToggle, visible }: { id: string; label: string; onToggle: (v: boolean) => void; visible: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1,
        px: 1.5,
        borderRadius: 1,
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex' }}>
        <DragIndicatorIcon fontSize="small" color="action" />
      </Box>
      <FormControlLabel
        control={<Checkbox size="small" checked={visible} onChange={(e) => onToggle(e.target.checked)} />}
        label={label}
        sx={{ flex: 1, m: 0 }}
      />
    </Box>
  );
}

type CustomizeColorsDialogProps = {
  open: boolean;
  onClose: () => void;
  tournament: Tournament;
  matches: Match[];
  standings: StandingRow[];
  standingsByGroup?: StandingsByGroup[];
  loadingMatches?: boolean;
  loadingStandings?: boolean;
  onSave: (params: {
    logoUrl?: string | null;
    publicPageColors?: {
      primary?: string;
      secondary?: string;
      fontColor?: string | null;
      backgroundType?: 'color' | 'gradient' | 'image' | null;
      backgroundColor?: string | null;
      backgroundGradient?: string | null;
      backgroundImage?: string | null;
      sectionOrder?: string[] | null;
      sectionVisibility?: Record<string, boolean> | null;
    } | null;
  }) => Promise<void>;
};

export function CustomizeColorsDialog({
  open,
  onClose,
  tournament,
  matches,
  standings,
  standingsByGroup = [],
  loadingMatches = false,
  loadingStandings = false,
  onSave,
}: CustomizeColorsDialogProps) {
  const { t } = useTranslation();
  const [primary, setPrimary] = useState(tournament.publicPageColors?.primary || DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(tournament.publicPageColors?.secondary || DEFAULT_SECONDARY);
  const [fontColor, setFontColor] = useState<string | ''>(tournament.publicPageColors?.fontColor || '');
  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image'>(
    (tournament.publicPageColors?.backgroundType as 'color' | 'gradient' | 'image') || 'color'
  );
  const [backgroundColor, setBackgroundColor] = useState(tournament.publicPageColors?.backgroundColor || DEFAULT_BG);
  const [backgroundGradient, setBackgroundGradient] = useState(
    tournament.publicPageColors?.backgroundGradient || DEFAULT_GRADIENT
  );
  const [backgroundImage, setBackgroundImage] = useState(tournament.publicPageColors?.backgroundImage || '');
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    tournament.publicPageColors?.sectionOrder?.length
      ? tournament.publicPageColors.sectionOrder
      : [...SECTION_IDS]
  );
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(
    tournament.publicPageColors?.sectionVisibility ?? {
      matches: true,
      standings: true,
      topScorers: true,
      cards: true,
    }
  );
  const [logoData, setLogoData] = useState<string | null>(tournament.logoUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const MAX_LOGO_SIZE_BYTES = 500 * 1024;
  const MAX_BG_IMAGE_SIZE_BYTES = 1024 * 1024; // 1MB for background

  useEffect(() => {
    if (open) {
      setPrimary(tournament.publicPageColors?.primary || DEFAULT_PRIMARY);
      setSecondary(tournament.publicPageColors?.secondary || DEFAULT_SECONDARY);
      setFontColor(tournament.publicPageColors?.fontColor || '');
      setBackgroundType((tournament.publicPageColors?.backgroundType as 'color' | 'gradient' | 'image') || 'color');
      setBackgroundColor(tournament.publicPageColors?.backgroundColor || DEFAULT_BG);
      setBackgroundGradient(tournament.publicPageColors?.backgroundGradient || DEFAULT_GRADIENT);
      setBackgroundImage(tournament.publicPageColors?.backgroundImage || '');
      setSectionOrder(
        tournament.publicPageColors?.sectionOrder?.length ? tournament.publicPageColors.sectionOrder : [...SECTION_IDS]
      );
      setSectionVisibility(
        tournament.publicPageColors?.sectionVisibility ?? {
          matches: true,
          standings: true,
          topScorers: true,
          cards: true,
        }
      );
      setLogoData(tournament.logoUrl || null);
      setError('');
    }
  }, [open, tournament.publicPageColors, tournament.logoUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tournament.id) return;
    if (!file.type.startsWith('image/')) {
      setError(t('tournament.detail.logoErrorImageOnly'));
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setError(t('tournament.detail.logoErrorMaxSize'));
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) return;
      try {
        const { url } = await uploadTournamentLogo(tournament.id, dataUrl, file.name, file.type);
        setLogoData(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('tournament.create.error'));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBgImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tournament.id) return;
    if (!file.type.startsWith('image/')) {
      setError(t('tournament.detail.logoErrorImageOnly'));
      return;
    }
    if (file.size > MAX_BG_IMAGE_SIZE_BYTES) {
      setError(t('tournament.detail.bgImageErrorMaxSize'));
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) return;
      try {
        const { url } = await uploadTournamentBackground(tournament.id, dataUrl, file.name, file.type);
        setBackgroundImage(url);
        setBackgroundType('image');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('tournament.create.error'));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    if (!event.over) return;
    setSectionOrder((prev) => {
      const oldIndex = prev.indexOf(event.active.id);
      const newIndex = prev.indexOf(event.over!.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const previewTournament: Tournament = {
    ...tournament,
    logoUrl: logoData || undefined,
    publicPageColors: {
            primary: primary || undefined,
            secondary: secondary || undefined,
            fontColor: fontColor || undefined,
            backgroundType: backgroundType,
      backgroundColor: backgroundType === 'color' ? backgroundColor : undefined,
      backgroundGradient: backgroundType === 'gradient' ? backgroundGradient : undefined,
      backgroundImage: backgroundType === 'image' ? backgroundImage : undefined,
      sectionOrder: sectionOrder,
      sectionVisibility: sectionVisibility,
    },
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave({
        logoUrl: logoData || null,
        publicPageColors: {
            primary: primary || undefined,
            secondary: secondary || undefined,
            fontColor: fontColor || undefined,
            backgroundType: backgroundType,
          backgroundColor: backgroundType === 'color' ? backgroundColor : undefined,
          backgroundGradient: backgroundType === 'gradient' ? backgroundGradient : undefined,
          backgroundImage: backgroundType === 'image' ? backgroundImage : undefined,
          sectionOrder: sectionOrder,
          sectionVisibility: sectionVisibility,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tournament.create.error'));
    } finally {
      setSaving(false);
    }
  };

  const sectionLabels: Record<string, string> = {
    matches: t('tournament.matches.title'),
    standings: t('tournament.standings.title'),
    topScorers: t('tournament.topScorers.title'),
    cards: t('tournament.cardsByMatch.title'),
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('tournament.detail.customizeColorsTitle')}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
          {/* Form */}
          <Box sx={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('tournament.pro.customColors')}
            </Typography>
            <ColorPickerField label={t('tournament.detail.colorPrimary')} value={primary} onChange={setPrimary} />
            <ColorPickerField label={t('tournament.detail.colorSecondary')} value={secondary} onChange={setSecondary} />
            <ColorPickerField
              label={t('tournament.detail.colorFont')}
              value={fontColor}
              onChange={setFontColor}
              placeholder={t('tournament.detail.colorFontOptional')}
            />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
              {t('tournament.detail.customizeBackground')}
            </Typography>
            <RadioGroup value={backgroundType} onChange={(e) => setBackgroundType(e.target.value as 'color' | 'gradient' | 'image')}>
              <FormControlLabel value="color" control={<Radio size="small" />} label={t('tournament.detail.bgColor')} />
              <FormControlLabel value="gradient" control={<Radio size="small" />} label={t('tournament.detail.bgGradient')} />
              <FormControlLabel value="image" control={<Radio size="small" />} label={t('tournament.detail.bgImage')} />
            </RadioGroup>
            {backgroundType === 'color' && (
              <ColorPickerField label={t('tournament.detail.backgroundColor')} value={backgroundColor} onChange={setBackgroundColor} />
            )}
            {backgroundType === 'gradient' && (
              <Box sx={{ width: 'fit-content' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {t('tournament.detail.backgroundGradient')}
                </Typography>
                <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', width: 280 }}>
                  <ColorPicker
                    value={backgroundGradient.includes('gradient') ? backgroundGradient : DEFAULT_GRADIENT}
                    onChange={setBackgroundGradient}
                    hideColorTypeBtns
                    width={280}
                    height={220}
                    locales={{
                      CONTROLS: { SOLID: t('tournament.detail.bgColor'), GRADIENT: t('tournament.detail.bgGradient') },
                    }}
                  />
                </Box>
              </Box>
            )}
            {backgroundType === 'image' && (
              <Box>
                <input
                  ref={bgImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgImageSelect}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => bgImageInputRef.current?.click()}
                  sx={{ mb: 1 }}
                >
                  {t('tournament.detail.bgImageSelect')}
                </Button>
                <TextField
                  label={t('tournament.detail.bgImageUrl')}
                  value={backgroundImage.startsWith('data:') ? '' : backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="https://..."
                  disabled={!!backgroundImage && backgroundImage.startsWith('data:')}
                />
                {backgroundImage && (
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setBackgroundImage('')} sx={{ mt: 1 }}>
                    {t('tournament.detail.logoRemoveImage')}
                  </Button>
                )}
              </Box>
            )}

            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
              {t('tournament.detail.sectionOrder')}
            </Typography>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {sectionOrder.map((id) => (
                    <SortableSectionItem
                      key={id}
                      id={id}
                      label={sectionLabels[id] ?? id}
                      visible={sectionVisibility[id] !== false}
                      onToggle={(v) => setSectionVisibility((prev) => ({ ...prev, [id]: v }))}
                    />
                  ))}
                </Box>
              </SortableContext>
            </DndContext>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
              {t('tournament.detail.logoUploadLabel')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('tournament.detail.logoSelectImage')}
                </Button>
                {logoData && (
                  <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setLogoData(null)}>
                    {t('tournament.detail.logoRemoveImage')}
                  </Button>
                )}
              </Box>
              {logoData && (
                <Box
                  component="img"
                  src={logoData}
                  alt="Logo preview"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    objectFit: 'cover',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              )}
            </Box>
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
          </Box>

          {/* Preview */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              maxHeight: 520,
            }}
          >
            <Box sx={{ overflow: 'auto', maxHeight: 520 }}>
              <PublicTournamentView
                tournament={previewTournament}
                matches={matches}
                standings={standings}
                standingsByGroup={standingsByGroup}
                loadingMatches={loadingMatches}
                loadingStandings={loadingStandings}
                previewMode
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('tournament.create.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? t('tournament.create.submitting') : t('tournament.matches.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
