import type { Meta, StoryObj } from '@storybook/react';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { expect, within } from '@storybook/test';

const meta: Meta = {
  title: 'Introduction',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj;

export const LigaMatchStorybook: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /LigaMatch Storybook/i })).toBeInTheDocument();
    await expect(canvas.getByText(/Bienvenido al Storybook/i)).toBeInTheDocument();
    await expect(canvas.getByText(/AppBar/i)).toBeInTheDocument();
    await expect(canvas.getByText(/npm run storybook/i)).toBeInTheDocument();
  },
  render: () => (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        LigaMatch Storybook
      </Typography>
      <Typography paragraph>
        Bienvenido al Storybook del proyecto <strong>LigaMatch</strong>. Aquí
        puedes desarrollar y revisar componentes de la aplicación en aislamiento.
      </Typography>
      <Typography variant="h6" component="h2" gutterBottom>
        Estructura
      </Typography>
      <List dense>
        <ListItem>
          <ListItemText
            primary="AppBar"
            secondary="Barra de navegación principal (logo, enlaces, idioma, usuario)."
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Más historias"
            secondary="Se irán añadiendo en src/shared/components/**/*.stories.tsx"
          />
        </ListItem>
      </List>
      <Typography variant="h6" component="h2" gutterBottom>
        Cómo ejecutar
      </Typography>
      <Typography paragraph component="div">
        <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
          npm run storybook
        </code>
      </Typography>
      <Typography>
        Se abrirá en{' '}
        <Link href="http://localhost:6006" target="_blank" rel="noopener noreferrer">
          http://localhost:6006
        </Link>
        .
      </Typography>
    </Box>
  ),
};
