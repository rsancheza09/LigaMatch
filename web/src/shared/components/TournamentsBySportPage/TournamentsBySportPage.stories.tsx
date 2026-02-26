import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore } from '../../../../.storybook/storybookStore';
import { TournamentsBySportPage } from './TournamentsBySportPage';

const meta: Meta<typeof TournamentsBySportPage> = {
  title: 'Pages/TournamentsBySportPage',
  component: TournamentsBySportPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: [{ pathname: '/dashboard', state: { section: 'exploreSoccer' } }] } },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TournamentsBySportPage>;

export const Soccer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText(/fútbol|football|soccer/i)).toBeInTheDocument();
  },
};

export const Futsal: Story = {
  parameters: { router: { initialEntries: [{ pathname: '/dashboard', state: { section: 'exploreFutsal' } }] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText(/fútbol sala|futsal/i)).toBeInTheDocument();
  },
};
