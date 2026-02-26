import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore, loggedInStore } from '../../../../.storybook/storybookStore';
import { HomePage } from './HomePage';

const meta: Meta<typeof HomePage> = {
  title: 'Pages/HomePage',
  component: HomePage,
  parameters: { layout: 'fullscreen', router: { initialEntries: ['/'] } },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof HomePage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    const signIn = canvas.getByRole('button', { name: /iniciar sesión|sign in/i });
    await expect(signIn).toBeInTheDocument();
  },
};

export const LoggedIn: Story = {
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
