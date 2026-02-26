import type { Preview } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { store } from '../src/shared/store';
import '../src/shared/i18n';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0', light: '#42a5f5', dark: '#0d47a1' },
    secondary: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20' },
    background: { default: '#ffffff', paper: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
    router: {
      initialEntries: ['/'],
    },
  },
  decorators: [
    (Story, context) => {
      const initialEntries = context.parameters.router?.initialEntries ?? ['/'];
      return (
        <Provider store={store}>
          <MemoryRouter initialEntries={initialEntries}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <Story />
            </ThemeProvider>
          </MemoryRouter>
        </Provider>
      );
    },
  ],
};

export default preview;
