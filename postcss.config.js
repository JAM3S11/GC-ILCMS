import { config as reshapedConfig } from 'reshaped/config/postcss';

export default {
  ...reshapedConfig,
  plugins: {
    '@tailwindcss/postcss': {},
    '@csstools/postcss-global-data': reshapedConfig.plugins['@csstools/postcss-global-data'],
    'postcss-custom-media': reshapedConfig.plugins['postcss-custom-media'],
    cssnano: reshapedConfig.plugins.cssnano,
  },
};