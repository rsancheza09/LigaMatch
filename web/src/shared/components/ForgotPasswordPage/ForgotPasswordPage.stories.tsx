import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore } from '../../../../.storybook/storybookStore';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const meta: Meta<typeof ForgotPasswordPage> = {
  title: 'Pages/ForgotPasswordPage',
  component: ForgotPasswordPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: ['/forgot-password'] } },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ForgotPasswordPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /recuperar|forgot|password/i })).toBeInTheDocument();
    await expect(canvas.getByLabelText(/correo|email/i)).toBeInTheDocument();
  },
};
