import com.android.apksig.ApkSigner;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

/**
 * Assina o APK com o esquema v2 (apksig). O v1 (JAR) não é usado: o apksig 2.3.0
 * depende de APIs internas que o JDK 21 removeu, e com minSdk 24 o v2 basta.
 */
public class SignApk {
    public static void main(String[] a) throws Exception {
        String in = a[0], out = a[1], ks = a[2], alias = a[3], pass = a[4];
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream f = new FileInputStream(ks)) { store.load(f, pass.toCharArray()); }
        PrivateKey key = (PrivateKey) store.getKey(alias, pass.toCharArray());
        X509Certificate cert = (X509Certificate) store.getCertificate(alias);
        ApkSigner.SignerConfig cfg = new ApkSigner.SignerConfig.Builder("pinguim", key,
                Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(cfg))
                .setInputApk(new File(in)).setOutputApk(new File(out))
                .setV1SigningEnabled(false).setV2SigningEnabled(true)
                .setMinSdkVersion(24)
                .build().sign();
        System.out.println("assinado: " + out);
    }
}
