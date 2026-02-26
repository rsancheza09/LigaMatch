import type { StorybookConfig } from '@storybook/react-webpack5';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-webpack5-compiler-babel',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, '../src/shared'),
      '@components': path.resolve(__dirname, '../src/shared/components'),
      '@utils': path.resolve(__dirname, '../src/shared/utils'),
    };
    config.resolve.modules = [
      ...(config.resolve.modules ?? []),
      path.resolve(__dirname, '../src'),
      'node_modules',
    ];
    return config;
  },
};

export default config;
