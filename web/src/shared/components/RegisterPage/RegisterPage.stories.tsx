import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { expect, within } from '@storybook/test';

import { defaultStore } from '../../../../.storybook/storybookStore';
import { RegisterPage } from './RegisterPage';

const meta: Meta<typeof RegisterPage> = {
  title: 'Pages/RegisterPage',
  component: RegisterPage,
  parameters: { layout: 'fullscreen', router: { initialEntries: ['/register'] } },
  decorators: [
    (Story) => (
      <Provider store={defaultStore}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RegisterPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /registro|register/i })).toBeInTheDocument();
    await expect(canvas.getByLabelText(/correo|email/i)).toBeInTheDocument();
  },
};
