const path = require('path');
const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config');

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: [
    'webpack-dev-server/client?http://localhost:4000',
    path.resolve(__dirname, 'src/app/index.tsx'),
  ],
  devServer: {
    historyApiFallback: { index: '/static/' },
    hot: true,
    port: Number(process.env.PORT) || 4000,
    host: '0.0.0.0',
    client: {
      overlay: { errors: true, runtimeErrors: false, warnings: false },
    },
  },
});
