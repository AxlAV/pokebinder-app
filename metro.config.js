const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Garantiza que el directorio de trabajo sea siempre la raíz del proyecto
// (donde residen package.json, global.css y tailwind.config.js) incluso cuando
// Gradle ejecuta Metro desde la subcarpeta android/ en compilaciones release.
if (process.cwd() !== __dirname) {
  try {
    process.chdir(__dirname);
  } catch (e) {
    console.warn('[Metro] Failed to chdir to __dirname:', e);
  }
}

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: path.resolve(__dirname, 'global.css'),
  configPath: path.resolve(__dirname, 'tailwind.config.js'),
});
