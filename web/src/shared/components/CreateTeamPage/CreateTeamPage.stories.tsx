import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { loggedInStore } from '../../../../.storybook/storybookStore';
import { CreateTeamPage } from './CreateTeamPage';

const meta: Meta<typeof CreateTeamPage> = {
  title: 'Pages/CreateTeamPage',
  component: CreateTeamPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: [{ pathname: '/dashboard', state: { section: 'createTeam' } }] } },
  decorators: [
    (Story) => (
      <Provider store={loggedInStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CreateTeamPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText(/crear equipo|create team/i)).toBeInTheDocument();
  },
};
