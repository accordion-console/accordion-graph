/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const cjsTransformer = require('es-dev-commonjs-transformer');

module.exports = {
  port: 9385,
  hostname: `0.0.0.0`,
  watch: true,
  nodeResolve: true,
  babel: true,
  fileExtensions: ['.ts', '.js'],
  appIndex: 'demo/index.html',
  responseTransformers: [
    cjsTransformer([
        '**/node_modules/@open-wc/**/*',
    ]),
  ],  
  moduleDirs: ['node_modules'],
};