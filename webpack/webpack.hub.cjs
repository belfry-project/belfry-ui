const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const webpackConfig = require('./webpack.config');
const env = require('./environment.cjs');
const { HUB_SERVER } = env;
const proxyUrl = new URL(HUB_SERVER);
module.exports = function (env, argv) {
  const config = webpackConfig(env, argv);

  config.entry = './frontend/hub/main/Hub.tsx';

  // publicPath is the path where the bundle is served from
  // https://webpack.js.org/guides/public-path/
  config.output.publicPath = process.env.PUBLIC_PATH || process.env.ROUTE_PREFIX || '/';

  // FavIcons
  config.plugins.unshift(
    new FaviconsWebpackPlugin({
      logo: './frontend/assets/galaxy-icon.svg',
      inject: true,
    })
  );

  // webpack-dev-server 5 dropped `bypass`; set the headers on the proxied request instead.
  config.devServer.proxy = [
    {
      context: ['/api'],
      target: HUB_SERVER,
      secure: false,
      on: {
        proxyReq: (proxyReq) => {
          proxyReq.setHeader('host', proxyUrl.host);
          proxyReq.setHeader('origin', proxyUrl.origin);
          proxyReq.setHeader('referer', proxyUrl.href);
        },
      },
    },
  ];
  return config;
};
