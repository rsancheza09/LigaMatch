import type { SxProps, Theme } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { TFunction } from 'i18next';

export type DocumentTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
  labelId?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  showEmpty?: boolean;
  sx?: SxProps<Theme>;
};

export function DocumentTypeSelect({
  value,
  onChange,
  t,
  labelId = 'id-document-type',
  fullWidth = true,
  size = 'small',
  showEmpty = true,
  sx,
}: DocumentTypeSelectProps) {
  return (
    <FormControl fullWidth={fullWidth} size={size} sx={sx}>
      <InputLabel id={labelId}>{t('team.detail.idDocumentType')}</InputLabel>
      <Select
        labelId={labelId}
        value={value}
        label={t('team.detail.idDocumentType')}
        onChange={(e) => onChange(e.target.value)}
      >
        {showEmpty && <MenuItem value="">—</MenuItem>}
        <MenuItem value="cedula_nacional">{t('team.detail.idTypeCedulaNacional')}</MenuItem>
        <MenuItem value="cedula_residencia">{t('team.detail.idTypeCedulaResidencia')}</MenuItem>
        <MenuItem value="pasaporte">{t('team.detail.idTypePasaporte')}</MenuItem>
        <MenuItem value="dimex">{t('team.detail.idTypeDimex')}</MenuItem>
      </Select>
    </FormControl>
  );
}
