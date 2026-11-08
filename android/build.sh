#!/usr/bin/env bash
# あそぼう APK を つくる スクリプト（Gradle なし）
# つかいかた: bash android/build.sh   → dist/asobou.apk ができる
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$LOCALAPPDATA/asobou-build"
export JAVA_HOME="$T/jdk"; export PATH="$JAVA_HOME/bin:$PATH"
BT="$T/sdk/build-tools/34.0.0"
JAR="$T/sdk/platforms/android-34/android.jar"
KS="$T/asobou.keystore"; KP="$T/keystore-pass.txt"
VERSION_CODE="${VERSION_CODE:-1}"; VERSION_NAME="${VERSION_NAME:-1.0}"

B="$T/out"; rm -rf "$B"; mkdir -p "$B/res/mipmap-xxxhdpi" "$B/assets/www" "$B/classes" "$B/dex"
# アイコンと ゲームの ファイル
cp "$ROOT/icon-192.png" "$B/res/mipmap-xxxhdpi/ic_launcher.png"
cp "$ROOT"/*.html "$ROOT/icon-192.png" "$ROOT/icon-512.png" "$B/assets/www/"

"$BT/aapt2.exe" compile --dir "$(cygpath -w "$B/res")" -o "$(cygpath -w "$B/res.zip")"
"$BT/aapt2.exe" link -o "$(cygpath -w "$B/base.apk")" -I "$(cygpath -w "$JAR")" \
  --manifest "$(cygpath -w "$ROOT/android/AndroidManifest.xml")" \
  --min-sdk-version 22 --target-sdk-version 34 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  "$(cygpath -w "$B/res.zip")"

javac -nowarn -source 1.8 -target 1.8 -Xlint:-options -bootclasspath "$(cygpath -w "$JAR")" -encoding UTF-8 \
  -d "$(cygpath -w "$B/classes")" "$(cygpath -w "$ROOT/android/src/jp/asobou/games/MainActivity.java")"
cmd //c "$(cygpath -w "$BT/d8.bat")" --min-api 22 --lib "$(cygpath -w "$JAR")" --output "$(cygpath -w "$B/dex")" \
  $(cd "$B/classes" && find . -name '*.class' | sed "s#^\./#$(cygpath -w "$B/classes" | sed 's#\\#\\\\#g')\\\\#")
(cd "$B/dex" && jar uf0M "$(cygpath -w "$B/base.apk")" classes.dex)
# ゲームの ファイル（aapt2 -A だと Windows で パスが「\」に なるので jar で いれる）
(cd "$B" && jar uf0M "$(cygpath -w "$B/base.apk")" assets)

"$BT/zipalign.exe" -p -f 4 "$(cygpath -w "$B/base.apk")" "$(cygpath -w "$B/aligned.apk")"

# しょめい用の かぎ（さいしょの 1かいだけ つくる。アプリを こうしんする ときも おなじ かぎが ひつよう）
if [ ! -f "$KS" ]; then
  head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' > "$KP"
  keytool -genkeypair -keystore "$(cygpath -w "$KS")" -alias asobou -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat "$KP")" -keypass "$(cat "$KP")" -dname "CN=asobou" > /dev/null 2>&1
fi
mkdir -p "$ROOT/dist"
cmd //c "$(cygpath -w "$BT/apksigner.bat")" sign --ks "$(cygpath -w "$KS")" --ks-pass "file:$(cygpath -w "$KP")" \
  --out "$(cygpath -w "$ROOT/dist/asobou.apk")" "$(cygpath -w "$B/aligned.apk")"
cmd //c "$(cygpath -w "$BT/apksigner.bat")" verify "$(cygpath -w "$ROOT/dist/asobou.apk")" && echo "OK: dist/asobou.apk"
