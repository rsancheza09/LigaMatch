import type { SxProps, Theme } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { TFunction } from 'i18next';
import { GUARDIAN_RELATIONS } from '@shared/constants/player';

export type GuardianRelationSelectProps = {
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
  labelId?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  showEmpty?: boolean;
  sx?: SxProps<Theme>;
};

export function GuardianRelationSelect({
  value,
  onChange,
  t,
  labelId = 'guardian-relation',
  fullWidth = true,
  size = 'small',
  showEmpty = true,
  sx,
}: GuardianRelationSelectProps) {
  return (
    <FormControl fullWidth={fullWidth} size={size} sx={sx}>
      <InputLabel id={labelId}>{t('team.detail.guardianRelation')}</InputLabel>
      <Select
        labelId={labelId}
        value={value}
        label={t('team.detail.guardianRelation')}
        onChange={(e) => onChange(e.target.value)}
      >
        {showEmpty && <MenuItem value="">—</MenuItem>}
        <MenuItem value="padre">{t('team.detail.guardianRelationPadre')}</MenuItem>
        <MenuItem value="madre">{t('team.detail.guardianRelationMadre')}</MenuItem>
        <MenuItem value="encargado">{t('team.detail.guardianRelationEncargado')}</MenuItem>
      </Select>
    </FormControl>
  );
}
