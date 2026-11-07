const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const webpackConfig = require('./webpack.config');
const env = require('./environment.cjs');
const { AWX_SERVER } = env;
const proxyUrl = new URL(AWX_SERVER);
module.exports = function (env, argv) {
  const config = webpackConfig(env, argv);
  config.entry = './frontend/awx/main/Awx.tsx';

  // publicPath is the path where the bundle is served from
  // https://webpack.js.org/guides/public-path/
  config.output.publicPath = process.env.PUBLIC_PATH || process.env.ROUTE_PREFIX || '/';

  // FavIcons
  config.plugins.unshift(
    new FaviconsWebpackPlugin({
      logo: './frontend/assets/belfry-icon.svg',
      inject: true,
    })
  );

  // Set the headers on the proxied request (http-proxy-middleware 2, as used by webpack-dev-server 5).
  config.devServer.proxy = [
    {
      context: ['/api'],
      target: AWX_SERVER,
      secure: false,
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('host', proxyUrl.host);
        proxyReq.setHeader('origin', proxyUrl.origin);
        proxyReq.setHeader('referer', proxyUrl.href);
      },
    },
    {
      context: ['/sso'],
      target: AWX_SERVER,
      secure: false,
      onProxyReq: (proxyReq, req) => {
        proxyReq.setHeader('origin', proxyUrl.origin);
        proxyReq.setHeader('host', getRawHeader(req.rawHeaders, 'Host') || proxyUrl.host);
        proxyReq.setHeader('referer', getRawHeader(req.rawHeaders, 'Referer') || proxyUrl.href);
      },
    },
    {
      context: ['/websocket'],
      target: AWX_SERVER,
      secure: false,
      ws: true,
      changeOrigin: true,
    },
  ];
  return config;
};

function getRawHeader(rawHeaders, headerName) {
  const index = rawHeaders.indexOf(headerName);
  if (index === -1) {
    return null;
  }
  return rawHeaders[index + 1];
}
