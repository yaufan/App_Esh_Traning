/**
 * Android 正式版打包設定（expo prebuild 時套用）：
 *
 * 1. 簽章：有環境變數 ESH_TRAINING_KEYSTORE（.p12 路徑）時，正式版用這把金鑰簽章；
 *    和 yaufan 其他 APP 用同一把測試金鑰（別名 kidspaint、pkcs12），
 *    密碼放在 ESH_TRAINING_KEYSTORE_PASSWORD。沒有環境變數時沿用 debug 金鑰，方便本機試打包。
 * 2. 分機型打包：arm64（一般手機）、armv7（很舊的手機）、x86_64（模擬器、Chromebook）三個 APK。
 * 3. 正式版拿掉用不到的權限：本 APP 不連網、不讀寫檔案、不顯示在其他 APP 上方。
 *    只拿掉 release，debug 版仍保留網路權限，才能連開發伺服器。
 *
 * 找不到要改的位置時直接報錯，避免默默打包出沒簽章或沒分機型的 APK。
 */
const { withAppBuildGradle, withGradleProperties, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ABIS = ['arm64-v8a', 'armeabi-v7a', 'x86_64'];
const REMOVED_IN_RELEASE = [
  'android.permission.INTERNET',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

function replaceOnce(src, find, replacement, what) {
  const i = src.indexOf(find);
  if (i < 0) throw new Error(`[withAndroidRelease] 找不到 ${what}，Expo 範本可能改版了`);
  return src.slice(0, i) + replacement + src.slice(i + find.length);
}

function withSigningAndSplits(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes('ESH_TRAINING_KEYSTORE')) return cfg; // 已套用過

    g = replaceOnce(
      g,
      `    signingConfigs {
        debug {`,
      `    signingConfigs {
        release {
            def ks = System.getenv('ESH_TRAINING_KEYSTORE')
            if (ks) {
                storeFile file(ks)
                storeType 'pkcs12'
                storePassword System.getenv('ESH_TRAINING_KEYSTORE_PASSWORD')
                keyAlias 'kidspaint'
                keyPassword System.getenv('ESH_TRAINING_KEYSTORE_PASSWORD')
            }
        }
        debug {`,
      'signingConfigs 區塊',
    );

    g = replaceOnce(
      g,
      `            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
      `            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig System.getenv('ESH_TRAINING_KEYSTORE') ? signingConfigs.release : signingConfigs.debug`,
      'release 的 signingConfig',
    );

    g = replaceOnce(
      g,
      `    packagingOptions {`,
      `    splits {
        abi {
            enable true
            reset()
            include ${ABIS.map((a) => `'${a}'`).join(', ')}
            universalApk false
        }
    }
    packagingOptions {`,
      'packagingOptions 區塊',
    );

    cfg.modResults.contents = g;
    return cfg;
  });
}

function withArchitectures(config) {
  return withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      const item = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
      if (item) item.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    };
    set('reactNativeArchitectures', ABIS.join(','));
    set('org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    return cfg;
  });
}

function withReleaseManifest(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'release');
      fs.mkdirSync(dir, { recursive: true });
      const lines = REMOVED_IN_RELEASE.map((p) => `  <uses-permission android:name="${p}" tools:node="remove"/>`);
      fs.writeFileSync(
        path.join(dir, 'AndroidManifest.xml'),
        [
          '<?xml version="1.0" encoding="utf-8"?>',
          '<!-- withAndroidRelease：正式版拿掉用不到的權限 -->',
          '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">',
          ...lines,
          '</manifest>',
          '',
        ].join('\n'),
      );
      return cfg;
    },
  ]);
}

module.exports = function withAndroidRelease(config) {
  return withReleaseManifest(withArchitectures(withSigningAndSplits(config)));
};
