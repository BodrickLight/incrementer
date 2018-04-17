const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
    overlay: {
      warnings: true,
      errors: true,
    },
  },
  mode: "development",
});
