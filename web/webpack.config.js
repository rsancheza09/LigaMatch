const dotenv = require('dotenv');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const environmentVariables = Object.assign(
  dotenv.config({ quiet: true }).parsed || {},
  process.env,
);
const environment = Object.keys(environmentVariables).reduce(
  (env, nextKey) => ({
    ...env,
    [nextKey]: JSON.stringify(environmentVariables[nextKey]),
  }),
  {},
);

module.exports = {
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/static/',
    clean: true,
  },
  module: {
    rules: [
      {
        include: path.resolve(__dirname),
        test: /\.tsx?$/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash:8].[ext]',
              outputPath: 'assets',
            },
          },
        ],
      },
      {
        include: path.resolve(__dirname, 'src'),
        test: /\.scss$/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]',
                namedExport: false,
                exportLocalsConvention: 'as-is',
              },
            },
          },
          { loader: 'sass-loader', options: { api: 'modern' } },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      favicon: path.resolve(__dirname, 'src/assets/ligamatch-logo.png'),
    }),
    new webpack.ProvidePlugin({
      React: 'react',
    }),
    new webpack.DefinePlugin({ 'process.env': environment }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared/'),
      '@components': path.resolve(__dirname, 'src/shared/components/'),
      '@utils': path.resolve(__dirname, 'src/shared/utils/'),
    },
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    extensions: ['.ts', '.tsx', '.js'],
  },
};
