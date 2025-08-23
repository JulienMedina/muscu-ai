// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // IMPORTANT: Reanimated doit être le DERNIER plugin
    plugins: ["react-native-reanimated/plugin"],
  };
};
