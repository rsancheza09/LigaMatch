import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore, loggedInStore } from '../../../../.storybook/storybookStore';
import { TournamentDetailPage } from './TournamentDetailPage';

const meta: Meta<typeof TournamentDetailPage> = {
  title: 'Pages/TournamentDetailPage',
  component: TournamentDetailPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: ['/tournaments/demo-slug'] } },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TournamentDetailPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
  },
};

export const AsLoggedInUser: Story = {
  decorators: [
    (Story) => (
      <Provider store={loggedInStore}>
        <Story />
      </Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
  },
};
