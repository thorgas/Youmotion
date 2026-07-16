module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: ['@nkzw/babel-preset-fbtee', 'babel-preset-expo'],
  };
};
