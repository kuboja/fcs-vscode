//@ts-check

'use strict';

const webpack = require('webpack');
const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
module.exports = (env, argv) => {
  var isDevBuild = argv.mode !== 'production';

  /** @type WebpackConfig */
  const extensionConfig = {
    mode: isDevBuild ? 'development' : 'production',

    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/

    output: {
      // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]'
    },

    externals: {
      vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
      'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics',
      '@opentelemetry/tracing': 'commonjs @opentelemetry/tracing'
    },

    resolve: {
      // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
      extensions: ['.ts', '.js']
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader'
            }
          ]
        }
      ]
    },
    
    plugins: [
      new webpack.DefinePlugin({ IS_DEV_BUILD: JSON.stringify(isDevBuild) }),
    ],

    devtool: 'nosources-source-map',

    ignoreWarnings: [{ module: /vscode-languageserver-types/ }],

    infrastructureLogging: {
      level: "log", // enables logging required for problem matchers
    },
  }

  /** @type WebpackConfig */
  const mcpServerConfig = {
    mode: isDevBuild ? 'development' : 'production',

    target: 'node',

    entry: './src/mcpServer.ts',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'mcpServer.js',
      // No libraryTarget — this is a self-executing Node.js script, not a module.
    },

    externals: {
      // The MCP server does not use vscode.
      'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics',
      '@opentelemetry/tracing': 'commonjs @opentelemetry/tracing',
    },

    resolve: {
      extensions: ['.ts', '.js'],
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [{ loader: 'ts-loader' }],
        },
      ],
    },

    plugins: [
      new webpack.DefinePlugin({ IS_DEV_BUILD: JSON.stringify(isDevBuild) }),
    ],

    devtool: 'nosources-source-map',

    infrastructureLogging: {
      level: "log",
    },
  };

  return [extensionConfig, mcpServerConfig];
};
