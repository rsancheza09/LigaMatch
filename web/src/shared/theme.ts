import { createTheme } from '@mui/material/styles';

/**
 * Sporty, modern palette for LigaMatch (football & futsal).
 * Primary: strong blue (dynamism, trust). Secondary: amber/orange (energy, action).
 */
export const appPalette = {
  primary: {
    main: '#0277BD',
    light: '#03A9F4',
    dark: '#01579B',
  },
  secondary: {
    main: '#FF8F00',
    light: '#FFB74D',
    dark: '#E65100',
  },
  background: {
    default: '#ffffff',
    paper: '#f5f5f5',
  },
} as const;

export const appTheme = createTheme({
  palette: appPalette,
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600 },
    h4: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
});

/** Gradient for AppBar / hero sections using theme primary and secondary */
export const appBarGradient = 'linear-gradient(90deg, #01579B 0%, #0277BD 40%, #03A9F4 100%)';
export const heroGradient = 'linear-gradient(135deg, #0277BD, #FF8F00)';
