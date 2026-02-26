import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore } from '../../../../.storybook/storybookStore';
import { LoginPage } from './LoginPage';

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/LoginPage',
  component: LoginPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: ['/login'] } },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LoginPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /iniciar sesión|sign in/i })).toBeInTheDocument();
    const emailInput = canvas.getByLabelText(/correo|email/i);
    const passwordInput = canvas.getByLabelText(/contraseña|password/i);
    const submitBtn = canvas.getByRole('button', { name: /iniciar sesión|sign in/i });
    await expect(emailInput).toBeInTheDocument();
    await expect(passwordInput).toBeInTheDocument();
    await expect(submitBtn).toBeInTheDocument();
  },
};
