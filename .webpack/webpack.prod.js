const path = require('path');
const pkg = require('../package.json');

const outputFile = 'index.umd.js';
const rootDir = path.resolve(__dirname, '../');
const outputFolder = path.join(__dirname, `../dist/umd/${pkg.name}/`);

// Todo: add ESM build for the extension in addition to umd build

const config = {
  mode: 'production',
  entry: rootDir + '/' + pkg.module,
  devtool: 'source-map',
  output: {
    path: outputFolder,
    filename: outputFile,
    library: pkg.name,
    libraryTarget: 'umd',
    chunkFilename: '[name].chunk.js',
    umdNamedDefine: true,
    globalObject: "typeof self !== 'undefined' ? self : this",
  },
  externals: [
    {
      "cornerstone-wado-image-loader": {
        root: 'cornerstone-wado-image-loader',
        commonjs2: 'cornerstone-wado-image-loader',
        commonjs: 'cornerstone-wado-image-loader',
        amd: 'cornerstone-wado-image-loader',
      },
      'react': {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react',
      },
      'config-point': {
        root: 'config-point',
        commonjs2: 'config-point',
        commonjs: 'config-point',
        amd: 'config-point',
      },
      'classnames': {
        root: 'classnames',
        commonjs2: 'classnames',
        commonjs: 'classnames',
        amd: 'classnames',
      },
      'react-router-dom': {
        root: 'react-router-dom',
        commonjs2: 'react-router-dom',
        commonjs: 'react-router-dom',
        amd: 'react-router-dom',
      },
      'dicomweb-client': {
        root: 'dicomweb-client',
        commonjs2: 'dicomweb-client',
        commonjs: 'dicomweb-client',
        amd: 'dicomweb-client',
      },
      dcmjs: {
        root: 'dcmjs',
        commonjs2: 'dcmjs',
        commonjs: 'dcmjs',
        amd: 'dcmjs',
      },
      '@ohif/core': {
        commonjs2: '@ohif/core',
        commonjs: '@ohif/core',
        amd: '@ohif/core',
        root: '@ohif/core',
      },
      '@ohif/ui': {
        commonjs2: '@ohif/ui',
        commonjs: '@ohif/ui',
        amd: '@ohif/ui',
        root: '@ohif/ui',
      },
    },
  ],
  module: {
    rules: [
      {
        test: /(\.jsx|\.js|\.tsx|\.ts)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/,
        resolve: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    ],
  },
  resolve: {
    modules: [path.resolve('../../node_modules'),path.resolve('./node_modules'), path.resolve('./src')],
    extensions: ['.json', '.js', '.jsx', '.tsx', '.ts'],
  },
};

module.exports = config;
