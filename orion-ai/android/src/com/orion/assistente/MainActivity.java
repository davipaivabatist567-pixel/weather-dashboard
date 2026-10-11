package com.orion.assistente;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Casca nativa do Orion: mostra o orion.html (guardado em assets) num WebView.
 *
 * O HTML é servido por um endereço https de mentira (https://appassets.orion/) interceptado aqui,
 * porque a câmera e o microfone só funcionam em origens seguras e o localStorage precisa de uma
 * origem estável. Nada disso sai do aparelho: o único tráfego de rede é o do próprio Orion
 * (MediaPipe e API da IA).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.orion";
    private static final String ORIGIN = "https://" + HOST;
    private static final int REQ_MEDIA = 1;
    private static final int REQ_FILE = 2;
    private static final int BG = Color.parseColor("#02060D");

    private WebView web;
    private PermissionRequest pendingWebRequest;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        web.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // O Orion usa este sufixo para saber que a permissão da câmera é tratada pelo app.
        s.setUserAgentString(s.getUserAgentString() + " OrionApp/1.0");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || path.isEmpty() || "/".equals(path) || "/index.html".equals(path)) {
                    try {
                        return new WebResourceResponse("text/html", "utf-8", getAssets().open("index.html"));
                    } catch (IOException e) {
                        // cai no 404 abaixo
                    }
                }
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri u = Uri.parse(url);
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                    // sem app para abrir o link
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        handleWebPermission(request);
                    }
                });
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingWebRequest == request) pendingWebRequest = null;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(ORIGIN + "/");
    }

    /** Só a nossa origem pode usar câmera/microfone, e só depois de o Android liberar. */
    private void handleWebPermission(PermissionRequest request) {
        if (!ORIGIN.equals(originOf(request.getOrigin()))) {
            request.deny();
            return;
        }
        List<String> missing = new ArrayList<String>();
        for (String r : request.getResources()) {
            String perm = androidPermissionFor(r);
            if (perm != null && checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) missing.add(perm);
        }
        if (missing.isEmpty()) {
            grantAllowed(request);
        } else {
            if (pendingWebRequest != null) pendingWebRequest.deny();
            pendingWebRequest = request;
            requestPermissions(missing.toArray(new String[0]), REQ_MEDIA);
        }
    }

    private static String originOf(Uri u) {
        return u.getScheme() + "://" + u.getHost();
    }

    private static String androidPermissionFor(String webResource) {
        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(webResource)) return Manifest.permission.CAMERA;
        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(webResource)) return Manifest.permission.RECORD_AUDIO;
        return null;
    }

    /** Libera apenas os recursos (câmera/microfone) cuja permissão do Android está concedida. */
    private void grantAllowed(PermissionRequest request) {
        List<String> ok = new ArrayList<String>();
        for (String r : request.getResources()) {
            String perm = androidPermissionFor(r);
            if (perm != null && checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED) ok.add(r);
        }
        if (ok.isEmpty()) request.deny();
        else request.grant(ok.toArray(new String[0]));
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != REQ_MEDIA) return;
        PermissionRequest request = pendingWebRequest;
        pendingWebRequest = null;
        boolean blockedForGood = false;
        boolean denied = false;
        for (int i = 0; i < permissions.length; i++) {
            if (grantResults.length > i && grantResults[i] == PackageManager.PERMISSION_GRANTED) continue;
            denied = true;
            // Sem "mostrar de novo": o Android não pergunta mais, só as configurações do app resolvem.
            if (!shouldShowRequestPermissionRationale(permissions[i])) blockedForGood = true;
        }
        if (request != null) grantAllowed(request);
        if (denied) {
            Toast.makeText(this, "Permissão negada. Ative a Câmera em Configurações do Android → Apps → Orion AI → Permissões.", Toast.LENGTH_LONG).show();
            if (blockedForGood) {
                try {
                    startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
                } catch (Exception ignored) {
                    // aparelho sem a tela de detalhes do app
                }
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQ_FILE || fileCallback == null) return;
        fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        fileCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
