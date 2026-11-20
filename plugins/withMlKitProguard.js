const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MLKIT_PROGUARD_RULES = `
# Google ML Kit & Firebase Component Discovery (TextRecognition OCR)
-keep class * implements com.google.firebase.components.ComponentRegistrar {
    public <init>();
    *;
}
-keep class com.google.firebase.components.** { *; }
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_bundled_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_common.** { *; }
-keep class com.google.android.gms.vision.** { *; }
-keep class com.google.android.odml.image.** { *; }
-keep class com.rnmlkit.textrecognition.** { *; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.internal.mlkit_vision_text_bundled_common.**
`;

module.exports = function withMlKitProguard(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const proguardPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      if (fs.existsSync(proguardPath)) {
        const current = fs.readFileSync(proguardPath, 'utf8');
        if (!current.includes('com.rnmlkit.textrecognition')) {
          fs.writeFileSync(
            proguardPath,
            `${current.trimEnd()}\n${MLKIT_PROGUARD_RULES}`,
            'utf8'
          );
        }
      }
      return cfg;
    },
  ]);
};
