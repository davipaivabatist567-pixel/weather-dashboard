"""Gera o APK Android do jogo sem precisar do Android SDK.

O app é uma Activity com WebView em tela cheia (sempre na horizontal) que abre
o HTML único do jogo (dist/aventura-do-pinguim.html) guardado em assets/.

Ferramentas (baixadas do Maven Central para android/.cache):
  - android-4.1.1.4.jar  : classes do Android para compilar o Java
  - dalvik-dx-16.0.1.jar : converte .class em classes.dex
  - apksig-2.3.0.jar     : assinatura v2
O AndroidManifest.xml binário e o resources.arsc (só o ícone) são escritos
por este script, já que o aapt2 (Android SDK) não está disponível.

Uso: python3 android/tools/build_apk.py
Saída: dist/aventura-do-pinguim.apk
"""
import io, os, shutil, struct, subprocess, sys, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ANDROID = os.path.dirname(HERE)
ROOT = os.path.dirname(ANDROID)
CACHE = os.path.join(ANDROID, '.cache')
BUILD = os.path.join(ANDROID, 'build')

PACKAGE = 'com.davi.pinguimluta'
APP_NAME = 'Pinguim Luta'
VERSION_CODE = 1
VERSION_NAME = '1.0'
MIN_SDK, TARGET_SDK = 24, 33  # Android 7.0+ (assinatura v2)
KEYSTORE = os.path.join(ANDROID, 'keystore', 'pinguim-debug.p12')
KEY_ALIAS, KEY_PASS = 'pinguim', 'pinguim123'

MAVEN = 'https://repo1.maven.org/maven2/'
DEPS = {
    'android-4.1.1.4.jar': 'com/google/android/android/4.1.1.4/android-4.1.1.4.jar',
    'dalvik-dx-16.0.1.jar': 'com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar',
    'apksig-2.3.0.jar': 'com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar',
}

# ids de android.R.attr / android.R.style (conferidos no android.jar)
ATTR = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003,
    'exported': 0x01010010, 'screenOrientation': 0x0101001e, 'configChanges': 0x0101001f,
    'minSdkVersion': 0x0101020c, 'versionCode': 0x0101021b, 'versionName': 0x0101021c,
    'targetSdkVersion': 0x01010270, 'hardwareAccelerated': 0x010102d3,
}
STYLE_BLACK_NOTITLE_FULLSCREEN = 0x0103000a
ICON_ID = 0x7f010000  # pacote 0x7f, tipo 1 (drawable), entrada 0
ANDROID_NS = 'http://schemas.android.com/apk/res/android'

T_REF, T_STRING, T_INT_DEC, T_INT_HEX, T_BOOL = 0x01, 0x03, 0x10, 0x11, 0x12


def run(cmd, **kw):
    print('$', ' '.join(cmd) if isinstance(cmd, list) else cmd)
    subprocess.run(cmd, check=True, **kw)


def fetch_deps():
    os.makedirs(CACHE, exist_ok=True)
    for name, path in DEPS.items():
        dest = os.path.join(CACHE, name)
        if not os.path.exists(dest):
            print('baixando', name)
            urllib.request.urlretrieve(MAVEN + path, dest)


# ---------------------------------------------------------------------------
# Pool de strings (formato binário do Android)
# ---------------------------------------------------------------------------
def string_pool(strings, utf8=False):
    data = b''
    offsets = []
    for s in strings:
        offsets.append(len(data))
        if utf8:
            b = s.encode('utf-8')
            assert len(s) < 128 and len(b) < 128
            data += bytes([len(s), len(b)]) + b + b'\0'
        else:
            u = s.encode('utf-16-le')
            assert len(s) < 0x8000
            data += struct.pack('<H', len(s)) + u + b'\0\0'
    while len(data) % 4:
        data += b'\0'
    header_size = 28
    strings_start = header_size + 4 * len(strings)
    size = strings_start + len(data)
    flags = 0x100 if utf8 else 0
    out = struct.pack('<HHIIIIII', 0x0001, header_size, size, len(strings), 0, flags, strings_start, 0)
    out += b''.join(struct.pack('<I', o) for o in offsets) + data
    return out


# ---------------------------------------------------------------------------
# AndroidManifest.xml binário (AXML)
# ---------------------------------------------------------------------------
class Axml:
    def __init__(self):
        self.attr_names = []   # nomes com id de recurso (vão primeiro no pool)
        self.others = []
        self.events = []

    def _str(self, s):
        if s is None:
            return None
        if s in self.others:
            return s
        self.others.append(s)
        return s

    def start(self, tag, attrs=(), ns_decl=False):
        # attrs: (nome, tipo, valor) — nome "android:x" ou simples
        self.events.append(('start', tag, list(attrs), ns_decl))

    def end(self, tag):
        self.events.append(('end', tag))

    def build(self):
        # coleta strings: atributos android primeiro (mapeados para ids)
        for ev in self.events:
            if ev[0] == 'start':
                for name, typ, val in ev[2]:
                    if name.startswith('android:'):
                        n = name[8:]
                        if n not in self.attr_names:
                            self.attr_names.append(n)
        self.attr_names.sort(key=lambda n: ATTR[n])
        pool = list(self.attr_names)
        def idx(s):
            if s not in pool:
                pool.append(s)
            return pool.index(s)
        for s in ['android', ANDROID_NS]:
            idx(s)
        for ev in self.events:
            idx(ev[1])
            if ev[0] == 'start':
                for name, typ, val in ev[2]:
                    if not name.startswith('android:'):
                        idx(name)
                    if typ == T_STRING:
                        idx(val)

        NONE = 0xFFFFFFFF
        ns_i = pool.index(ANDROID_NS)
        body = b''
        line = 1
        body += struct.pack('<HHIII', 0x0100, 16, 24, line, NONE) + struct.pack('<II', pool.index('android'), ns_i)
        for ev in self.events:
            line += 1
            if ev[0] == 'start':
                attrs = []
                for name, typ, val in ev[2]:
                    if name.startswith('android:'):
                        a_ns, a_name, key = ns_i, pool.index(name[8:]), ATTR[name[8:]]
                    else:
                        a_ns, a_name, key = NONE, pool.index(name), 0
                    if typ == T_STRING:
                        raw, data = pool.index(val), pool.index(val)
                    else:
                        raw, data = NONE, val & 0xFFFFFFFF
                    attrs.append((key, struct.pack('<IIIHBBI', a_ns, a_name, raw, 8, 0, typ, data)))
                # o Android exige atributos ordenados pelo id do recurso
                attrs.sort(key=lambda a: (a[0] == 0, a[0]))
                ext = struct.pack('<IIHHHHHH', NONE, pool.index(ev[1]), 20, 20, len(attrs), 0, 0, 0)
                payload = ext + b''.join(a[1] for a in attrs)
                body += struct.pack('<HHIII', 0x0102, 16, 16 + len(payload), line, NONE) + payload
            else:
                body += struct.pack('<HHIII', 0x0103, 16, 24, line, NONE) + struct.pack('<II', NONE, pool.index(ev[1]))
        body += struct.pack('<HHIII', 0x0101, 16, 24, line + 1, NONE) + struct.pack('<II', pool.index('android'), ns_i)

        sp = string_pool(pool)
        resmap = struct.pack('<HHI', 0x0180, 8, 8 + 4 * len(self.attr_names)) + \
            b''.join(struct.pack('<I', ATTR[n]) for n in self.attr_names)
        content = sp + resmap + body
        return struct.pack('<HHI', 0x0003, 8, 8 + len(content)) + content


def manifest():
    x = Axml()
    x.start('manifest', [('package', T_STRING, PACKAGE), ('android:versionCode', T_INT_DEC, VERSION_CODE),
                         ('android:versionName', T_STRING, VERSION_NAME)])
    x.start('uses-sdk', [('android:minSdkVersion', T_INT_DEC, MIN_SDK), ('android:targetSdkVersion', T_INT_DEC, TARGET_SDK)])
    x.end('uses-sdk')
    x.start('uses-permission', [('android:name', T_STRING, 'android.permission.INTERNET')])
    x.end('uses-permission')
    x.start('application', [('android:label', T_STRING, APP_NAME), ('android:icon', T_REF, ICON_ID),
                            ('android:theme', T_REF, STYLE_BLACK_NOTITLE_FULLSCREEN),
                            ('android:hardwareAccelerated', T_BOOL, 0xFFFFFFFF)])
    # 6 = sensorLandscape; configChanges: orientation|keyboardHidden|keyboard|screenSize|screenLayout|smallestScreenSize
    x.start('activity', [('android:name', T_STRING, PACKAGE + '.MainActivity'), ('android:exported', T_BOOL, 0xFFFFFFFF),
                         ('android:screenOrientation', T_INT_DEC, 6), ('android:configChanges', T_INT_HEX, 0x0DB0),
                         ('android:label', T_STRING, APP_NAME)])
    x.start('intent-filter')
    x.start('action', [('android:name', T_STRING, 'android.intent.action.MAIN')]); x.end('action')
    x.start('category', [('android:name', T_STRING, 'android.intent.category.LAUNCHER')]); x.end('category')
    x.end('intent-filter')
    x.end('activity')
    x.end('application')
    x.end('manifest')
    return x.build()


# ---------------------------------------------------------------------------
# resources.arsc com um único recurso: drawable/ic_launcher
# ---------------------------------------------------------------------------
def resources_arsc(icon_path):
    values = string_pool([icon_path], utf8=True)
    types = string_pool(['drawable'], utf8=True)
    keys = string_pool(['ic_launcher'], utf8=True)

    spec = struct.pack('<HHIBBHI', 0x0202, 16, 16 + 4, 1, 0, 0, 1) + struct.pack('<I', 0)
    config = struct.pack('<I', 64) + b'\0' * 60          # configuração padrão (qualquer tela)
    header_size = 20 + len(config)
    entries = struct.pack('<HHI', 8, 0, 0) + struct.pack('<HBBI', 8, 0, T_STRING, 0)
    offsets = struct.pack('<I', 0)
    entries_start = header_size + len(offsets)
    type_chunk = struct.pack('<HHIBBHII', 0x0201, header_size, entries_start + len(entries), 1, 0, 0, 1, entries_start) \
        + config + offsets + entries

    pkg_header = 288
    name = PACKAGE.encode('utf-16-le').ljust(256, b'\0')
    type_off = pkg_header
    key_off = pkg_header + len(types)
    body = types + keys + spec + type_chunk
    pkg = struct.pack('<HHII', 0x0200, pkg_header, pkg_header + len(body), 0x7f) + name + \
        struct.pack('<IIIII', type_off, 1, key_off, 1, 0) + body
    content = values + pkg
    return struct.pack('<HHII', 0x0002, 12, 12 + len(content), 1) + content


# ---------------------------------------------------------------------------
def make_icon(dest):
    from PIL import Image, ImageDraw
    src = Image.open(os.path.join(ROOT, 'assets/sprites/pingui_retrato.png')).convert('RGBA')
    size = 192
    icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(icon)
    d.rounded_rectangle([4, 4, size - 5, size - 5], radius=40, fill=(13, 44, 92, 255), outline=(79, 195, 255, 255), width=6)
    scale = min((size - 40) / src.width, (size - 36) / src.height)
    s = src.resize((round(src.width * scale), round(src.height * scale)), Image.NEAREST)
    icon.alpha_composite(s, ((size - s.width) // 2, size - s.height - 16))
    icon.save(dest)


def compile_dex():
    classes = os.path.join(BUILD, 'classes')
    stub = os.path.join(BUILD, 'stub')
    for d in (classes, stub):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)
    android_jar = os.path.join(CACHE, 'android-4.1.1.4.jar')
    run(['javac', '-nowarn', '-Xlint:-options', '--release', '8', '-d', stub,
         os.path.join(ANDROID, 'stub/android/webkit/JavascriptInterface.java')])
    srcs = []
    for base, _, files in os.walk(os.path.join(ANDROID, 'src')):
        srcs += [os.path.join(base, f) for f in files if f.endswith('.java')]
    # java.* vem do próprio JDK (--release 8); android.* do android.jar
    run(['javac', '-nowarn', '-Xlint:-options', '--release', '8', '-encoding', 'UTF-8',
         '-classpath', android_jar + os.pathsep + stub, '-d', classes] + srcs)
    dex = os.path.join(BUILD, 'classes.dex')
    run(['java', '-cp', os.path.join(CACHE, 'dalvik-dx-16.0.1.jar'), 'com.android.dx.command.Main',
         '--dex', '--min-sdk-version=' + str(MIN_SDK), '--output=' + dex, classes])
    return dex


def ensure_keystore():
    if os.path.exists(KEYSTORE):
        return
    os.makedirs(os.path.dirname(KEYSTORE), exist_ok=True)
    run(['keytool', '-genkeypair', '-keystore', KEYSTORE, '-storetype', 'PKCS12', '-alias', KEY_ALIAS,
         '-storepass', KEY_PASS, '-keypass', KEY_PASS, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
         '-dname', 'CN=Aventura do Pinguim, O=Davi, C=BR'])


def write_zip(path, files):
    """files: lista (nome, bytes, comprimir). Entradas sem compressão alinhadas em 4 bytes."""
    with open(path, 'wb') as raw:
        zf = zipfile.ZipFile(raw, 'w')
        for name, data, compress in files:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED if compress else zipfile.ZIP_STORED
            info.external_attr = 0o644 << 16
            if not compress:
                # cabeçalho local = 30 + nome + extra; ajusta o extra para alinhar os dados
                offset = raw.tell() + 30 + len(name.encode())
                pad = (4 - offset % 4) % 4
                info.extra = b'\0' * pad
            zf.writestr(info, data)
        zf.close()


def main():
    fetch_deps()
    os.makedirs(BUILD, exist_ok=True)
    # 1) HTML único atualizado
    run([sys.executable, os.path.join(ROOT, 'tools/build_single_html.py')])
    html = open(os.path.join(ROOT, 'dist/aventura-do-pinguim.html'), 'rb').read()
    # 2) ícone, manifesto, recursos
    icon_png = os.path.join(BUILD, 'ic_launcher.png')
    make_icon(icon_png)
    icon_res = 'res/drawable/ic_launcher.png'
    # 3) código
    dex = compile_dex()
    unsigned = os.path.join(BUILD, 'unsigned.apk')
    write_zip(unsigned, [
        ('AndroidManifest.xml', manifest(), True),
        ('resources.arsc', resources_arsc(icon_res), False),  # Android 11+: sem compressão e alinhado
        ('classes.dex', open(dex, 'rb').read(), True),
        (icon_res, open(icon_png, 'rb').read(), False),
        ('assets/index.html', html, True),
    ])
    # 4) assinatura
    ensure_keystore()
    tools_cls = os.path.join(BUILD, 'tools')
    os.makedirs(tools_cls, exist_ok=True)
    apksig = os.path.join(CACHE, 'apksig-2.3.0.jar')
    run(['javac', '-nowarn', '-cp', apksig, '-d', tools_cls, os.path.join(HERE, 'SignApk.java')])
    out = os.path.join(ROOT, 'dist', 'aventura-do-pinguim.apk')
    # apksig 2.3.0 usa classes internas do JDK (precisa liberar no Java 9+)
    opens = ['--add-exports=java.base/sun.security.x509=ALL-UNNAMED', '--add-exports=java.base/sun.security.pkcs=ALL-UNNAMED',
             '--add-exports=java.base/sun.security.util=ALL-UNNAMED']
    run(['java'] + opens + ['-cp', apksig + os.pathsep + tools_cls, 'SignApk', unsigned, out, KEYSTORE, KEY_ALIAS, KEY_PASS])
    print('APK gerado: %s (%.0f KB)' % (os.path.relpath(out, ROOT), os.path.getsize(out) / 1024))


if __name__ == '__main__':
    main()
