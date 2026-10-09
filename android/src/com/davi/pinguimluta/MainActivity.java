package com.davi.pinguimluta;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Aventura do Pinguim: Fighting Arena — app Android.
 * Abre o jogo (assets/index.html) numa WebView em tela cheia, sempre na horizontal.
 */
public class MainActivity extends Activity {
    private WebView web;

    // flags de View (constantes de APIs mais novas que o android.jar de compilação)
    private static final int IMMERSIVE = 0x00000002 /* HIDE_NAVIGATION */ | 0x00000004 /* FULLSCREEN */
            | 0x00000100 /* LAYOUT_STABLE */ | 0x00000200 /* LAYOUT_HIDE_NAVIGATION */
            | 0x00000400 /* LAYOUT_FULLSCREEN */ | 0x00001000 /* IMMERSIVE_STICKY */;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF050B1F);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        // API 17+: permite o som tocar sem exigir um toque extra
        try {
            WebSettings.class.getMethod("setMediaPlaybackRequiresUserGesture", boolean.class).invoke(s, false);
        } catch (Exception ignored) { }
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(), "PFAndroid");
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        setContentView(web);
        hideSystemUi();
        if (state != null) web.restoreState(state);
        else web.loadUrl("file:///android_asset/index.html");
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    public void onBackPressed() {
        // o jogo decide: pausar, voltar de tela ou fechar o app
        web.loadUrl("javascript:(window.PFAndroidBack?PFAndroidBack():PFAndroid.exit())");
    }

    @Override
    protected void onPause() {
        web.loadUrl("javascript:(window.PFAndroidPause&&PFAndroidPause())");
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        hideSystemUi();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    /** Ponte JavaScript -> Android. */
    public class Bridge {
        @JavascriptInterface
        public void exit() {
            runOnUiThread(new Runnable() {
                public void run() { finish(); }
            });
        }
    }
}
