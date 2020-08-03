/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const cjsTransformer = require('es-dev-commonjs-transformer');
const proxy = require('koa-proxies');

module.exports = {
  port: 9385,
  hostname: `0.0.0.0`,
  watch: true,
  nodeResolve: true,
  babel: true,
  fileExtensions: ['.ts', '.js'],
  appIndex: 'index.html',
  responseTransformers: [
    cjsTransformer([
        '**/node_modules/@open-wc/**/*',
    ]),
  ],  
  middlewares: [
    proxy('/kiali', {
      target: 'http://10.20.200.201:30021/kiali/api',
      rewrite: (path) => path.replace(/^\/kiali/, ""),
    }),
  ],
  moduleDirs: ['node_modules'],
};