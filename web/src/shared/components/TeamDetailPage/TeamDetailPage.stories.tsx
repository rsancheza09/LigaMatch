import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore } from '../../../../.storybook/storybookStore';
import { TeamDetailPage } from './TeamDetailPage';

const meta: Meta<typeof TeamDetailPage> = {
  title: 'Pages/TeamDetailPage',
  component: TeamDetailPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: ['/teams/team-1'] } },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TeamDetailPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
  },
};
