#!/usr/bin/env bash
# Gera orion.apk (WebView + orion.html em assets) sem Gradle nem Android Studio.
# Requisitos (Ubuntu/Debian): sudo apt install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# Uso: npm run build:apk   (gera antes o orion.html com npm run build:html)
set -euo pipefail
cd "$(dirname "$0")/.."

ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
DX="${DX:-/usr/lib/android-sdk/build-tools/debian/dx}"
KEYSTORE="${KEYSTORE:-android/orion-debug.keystore}"
HTML="${HTML:-orion.html}"
OUT="${OUT:-orion.apk}"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT

[ -f "$HTML" ] || { echo "Falta $HTML. Rode: npm run build:html"; exit 1; }
[ -f "$ANDROID_JAR" ] || { echo "android.jar não encontrado em $ANDROID_JAR"; exit 1; }

# 1. Assets: o app inteiro é o HTML.
mkdir -p "$BUILD/assets" "$BUILD/classes"
cp "$HTML" "$BUILD/assets/index.html"

# 2. Compila o Java (bytecode Java 8, exigido pelo dx).
javac -nowarn --release 8 -classpath "$ANDROID_JAR" -d "$BUILD/classes" android/src/com/orion/assistente/*.java 2>&1 | grep -v "^Picked up\|^warning: \[options\]\|^Note:" || true
[ -f "$BUILD/classes/com/orion/assistente/MainActivity.class" ] || { echo "Falha ao compilar MainActivity"; exit 1; }

# 3. Converte para Dalvik.
"$DX" --dex --min-sdk-version=21 --output="$BUILD/classes.dex" "$BUILD/classes"

# 4. Empacota recursos + manifesto + assets e acrescenta o dex.
aapt package -f -M android/AndroidManifest.xml -S android/res -A "$BUILD/assets" -I "$ANDROID_JAR" \
  --min-sdk-version 21 --target-sdk-version 34 -F "$BUILD/unsigned.apk"
(cd "$BUILD" && aapt add unsigned.apk classes.dex >/dev/null)

# 5. Alinha e assina (v1+v2+v3).
zipalign -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [ ! -f "$KEYSTORE" ]; then
  echo "Criando chave de assinatura em $KEYSTORE"
  keytool -genkeypair -keystore "$KEYSTORE" -storepass orion-debug -keypass orion-debug -alias orion \
    -keyalg RSA -keysize 2048 -validity 36500 -dname "CN=Orion AI, O=Orion, C=BR" 2>&1 | grep -v "^Picked up" || true
fi
apksigner sign --ks "$KEYSTORE" --ks-pass pass:orion-debug --key-pass pass:orion-debug --ks-key-alias orion \
  --min-sdk-version 21 --v4-signing-enabled false --out "$OUT" "$BUILD/aligned.apk" 2>&1 | grep -v "^Picked up" || true
apksigner verify --verbose "$OUT" 2>&1 | grep -v "^Picked up" | head -6
echo "[orion] APK pronto: $OUT ($(du -k "$OUT" | cut -f1) KB)"
