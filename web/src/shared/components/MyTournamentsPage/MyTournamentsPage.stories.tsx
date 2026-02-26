import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { loggedInStore } from '../../../../.storybook/storybookStore';
import { MyTournamentsPage } from './MyTournamentsPage';

const meta: Meta<typeof MyTournamentsPage> = {
  title: 'Pages/MyTournamentsPage',
  component: MyTournamentsPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: [{ pathname: '/dashboard', state: { section: 'tournaments' } }] } },
  decorators: [
    (Story) => (
      <Provider store={loggedInStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof MyTournamentsPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText(/torneos que administro|tournaments i manage|mis torneos/i)).toBeInTheDocument();
  },
};
