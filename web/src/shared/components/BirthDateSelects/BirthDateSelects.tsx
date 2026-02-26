import type { SxProps, Theme } from '@mui/material';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import type { TFunction } from 'i18next';
import { getDaysInMonth } from '@shared/utils/dateUtils';

export type BirthDateSelectsProps = {
  day: number | '';
  month: number | '';
  year: number | '';
  onDay: (v: number | '') => void;
  onMonth: (v: number | '') => void;
  onYear: (v: number | '') => void;
  t: TFunction;
  /** e.g. 'add-player' or 'profile' */
  labelIdPrefix?: string;
  /** Optional sx applied to each Select (e.g. highlight) */
  selectSx?: SxProps<Theme>;
  /** If true, show section title "Fecha de nacimiento" above the row */
  showSectionTitle?: boolean;
};

const BIRTH_YEAR_MIN = 1900;
const BIRTH_YEAR_MAX = 2030;

export function BirthDateSelects({
  day,
  month,
  year,
  onDay,
  onMonth,
  onYear,
  t,
  labelIdPrefix = 'birth',
  selectSx,
  showSectionTitle = true,
}: BirthDateSelectsProps) {
  const daysInMonth = month !== '' && year !== '' ? getDaysInMonth(Number(month), Number(year)) : 31;
  const dayLabelId = `${labelIdPrefix}-birth-day`;
  const monthLabelId = `${labelIdPrefix}-birth-month`;
  const yearLabelId = `${labelIdPrefix}-birth-year`;

  return (
    <>
      {showSectionTitle && (
        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>{t('team.detail.birthDate')}</Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel id={dayLabelId}>{t('team.detail.birthDay')}</InputLabel>
          <Select
            labelId={dayLabelId}
            value={day === '' ? '' : String(day)}
            label={t('team.detail.birthDay')}
            onChange={(e) => onDay(e.target.value === '' ? '' : Number(e.target.value))}
            sx={selectSx}
          >
            <MenuItem value="">—</MenuItem>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id={monthLabelId}>{t('team.detail.birthMonth')}</InputLabel>
          <Select
            labelId={monthLabelId}
            value={month === '' ? '' : String(month)}
            label={t('team.detail.birthMonth')}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value);
              onMonth(v);
              if (v !== '' && day !== '' && year !== '') {
                const maxD = getDaysInMonth(v, Number(year));
                if (day > maxD) onDay(maxD);
              }
            }}
            sx={selectSx}
          >
            <MenuItem value="">—</MenuItem>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <MenuItem key={m} value={m}>{t(`team.detail.month${m}`)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel id={yearLabelId}>{t('team.detail.birthYear')}</InputLabel>
          <Select
            labelId={yearLabelId}
            value={year === '' ? '' : String(year)}
            label={t('team.detail.birthYear')}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value);
              onYear(v);
              if (v !== '' && day !== '' && month !== '') {
                const maxD = getDaysInMonth(Number(month), v);
                if (day > maxD) onDay(maxD);
              }
            }}
            sx={selectSx}
          >
            <MenuItem value="">—</MenuItem>
            {Array.from({ length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1 }, (_, i) => BIRTH_YEAR_MIN + i)
              .reverse()
              .map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>
    </>
  );
}
