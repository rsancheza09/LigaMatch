import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore, loggedInStore } from '../../../../.storybook/storybookStore';
import { AppBar } from './AppBar';

const meta: Meta<typeof AppBar> = {
  title: 'AppBar',
  component: AppBar,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/'] },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AppBar>;

export const Default: Story = {
  args: {
    title: 'LigaMatch',
    showBackButton: false,
  },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText('LigaMatch')).toBeInTheDocument();
  },
};

export const WithBackButton: Story = {
  args: {
    title: 'Detalle del torneo',
    showBackButton: true,
    backAriaLabel: 'Volver',
  },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /volver/i })).toBeInTheDocument();
    await expect(canvas.getByText('Detalle del torneo')).toBeInTheDocument();
  },
};

export const LoggedIn: Story = {
  args: {
    title: 'LigaMatch',
    showBackButton: false,
  },
  decorators: [
    (Story) => (
      <Provider store={loggedInStore}>
        <Story />
      </Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('LigaMatch')).toBeInTheDocument();
    const menu = canvas.getByRole('button', { name: /menu|cuenta|account/i });
    await expect(menu).toBeInTheDocument();
  },
};
