import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '../package.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFile = 'index.esm.js';
const rootDir = path.resolve(__dirname, '../');
const outputFolder = path.join(__dirname, `../dist/esm/${pkg.name}/`);

// Todo: add ESM build for the extension in addition to umd build

const config = {
  mode: 'production',
  entry: path.join(rootDir, 'src/index.tsx'),
  devtool: 'source-map',
  output: {
    path: outputFolder,
    filename: outputFile,
    library: {
      type: 'module',
    },
    chunkFilename: '[name].chunk.js',
    module: true,
    environment: {
      module: true,
    },
  },
  experiments: {
    outputModule: true,
  },
  externals: {
    'cornerstone-wado-image-loader': 'cornerstone-wado-image-loader',
    '@cornerstonejs/core': '@cornerstonejs/core',
    '@cornerstonejs/dicom-image-loader': '@cornerstonejs/dicom-image-loader',
    react: {
      module: 'react',
      import: 'react',
    },
    'config-point': 'config-point',
    classnames: 'classnames',
    'react-router-dom': 'react-router-dom',
    'dicomweb-client': 'dicomweb-client',
    dcmjs: 'dcmjs',
    '@ohif/core': {
      module: '@ohif/core',
      import: '@ohif/core',
    },
    '@ohif/ui': '@ohif/ui',
  },
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
    modules: [
      path.resolve('../../node_modules'),
      path.resolve('./node_modules'),
      path.resolve('./src'),
    ],
    extensions: ['.json', '.js', '.jsx', '.tsx', '.ts'],
  },
};

export default config;
