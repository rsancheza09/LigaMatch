import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore } from '../../../../.storybook/storybookStore';
import { ResetPasswordPage } from './ResetPasswordPage';

const meta: Meta<typeof ResetPasswordPage> = {
  title: 'Pages/ResetPasswordPage',
  component: ResetPasswordPage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/reset-password?token=storybook-demo-token'] },
  },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ResetPasswordPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /nueva contraseña|new password|password/i })).toBeInTheDocument();
  },
};
