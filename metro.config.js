const { getDefaultConfig } = require("expo/metro-config");
2
const { withNativeWind } = require('nativewind/metro');
3
4
const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })