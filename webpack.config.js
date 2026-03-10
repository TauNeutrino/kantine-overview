const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'kantine.bundle.js',
    iife: true,
  },
  mode: 'production',
  optimization: {
    minimize: false, // We use terser later in the bash script
  },
};
