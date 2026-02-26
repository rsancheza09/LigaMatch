const path = require('path');
const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config');

module.exports = merge(baseConfig, {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/app/index.tsx'),
});
