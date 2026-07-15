const path = require('path');
const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config');

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: [path.resolve(__dirname, 'src/app/index.tsx')],
  devServer: {
    historyApiFallback: { index: '/static/' },
    hot: true,
    port: Number(process.env.PORT) || 4000,
    host: '0.0.0.0',
    allowedHosts: 'all',
    client: {
      overlay: { errors: true, runtimeErrors: false, warnings: false },
      // Avoid hard-coding localhost so remote/port-forwarded clients can connect HMR
      webSocketURL: 'auto://0.0.0.0:0/ws',
    },
    // Browser talks only to :4000; proxy forwards API paths to Hapi on :3000.
    // Fixes "Failed to fetch" when the UI is opened via remote port forwarding.
    proxy: [
      {
        context: [
          '/auth',
          '/health',
          '/tournaments',
          '/teams',
          '/users',
          '/notifications',
          '/messages',
          '/invitations',
          '/player-change-requests',
          '/documentation',
          '/swagger.json',
          '/swaggerui',
        ],
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    ],
  },
});
