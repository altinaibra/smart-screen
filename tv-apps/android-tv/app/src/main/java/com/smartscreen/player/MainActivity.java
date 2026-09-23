package com.smartscreen.player;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Aplikacion i thjeshtë WebView për Android TV, Sony Bravia (Android/Google TV),
 * Xiaomi Mi Box, Nvidia Shield, Fire TV etj. Hap player-in në ekran të plotë.
 */
public class MainActivity extends Activity {

    // Launcher-i lokal (assets/index.html) kërkon adresën e serverit herën e parë, e ruan
    // dhe pastaj hap player-in. Kështu i njëjti APK punon për çdo server pa u rindërtuar.
    private static final String LAUNCHER_URL = "file:///android_asset/index.html";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);            // localStorage për deviceKey dhe cache offline
        s.setMediaPlaybackRequiresUserGesture(false); // autoplay i videove
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(true);              // launcher-i nga assets (default false në Android 11+)

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // Serveri nuk u gjet -> kthehu te launcher-i, që provon përsëri çdo 10 sekonda
                if (request.isForMainFrame()) view.postDelayed(() -> view.loadUrl(LAUNCHER_URL), 5000);
            }
        });

        webView.loadUrl(LAUNCHER_URL);
        hideSystemUi();
    }

    private void hideSystemUi() {
        webView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onBackPressed() {
        // Mos e mbyll aplikacionin aksidentalisht me butonin "Back" të telekomandës
    }
}
