import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { loggedInStore } from '../../../../.storybook/storybookStore';
import { CreateTournamentPage } from './CreateTournamentPage';

const meta: Meta<typeof CreateTournamentPage> = {
  title: 'Pages/CreateTournamentPage',
  component: CreateTournamentPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: [{ pathname: '/dashboard', state: { section: 'createTournament' } }] } },
  decorators: [
    (Story) => (
      <Provider store={loggedInStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CreateTournamentPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText(/crear torneo|create tournament/i)).toBeInTheDocument();
  },
};
