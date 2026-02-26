import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { loggedInStore } from '../../../../.storybook/storybookStore';
import { ProfilePage } from './ProfilePage';

const meta: Meta<typeof ProfilePage> = {
  title: 'Pages/ProfilePage',
  component: ProfilePage,
  parameters: { layout: 'fullscreen', router: { initialEntries: [{ pathname: '/dashboard', state: { section: 'profile' } }] } },
  decorators: [
    (Story) => (
      <Provider store={loggedInStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ProfilePage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText(/perfil|profile|mi perfil/i)).toBeInTheDocument();
  },
};
