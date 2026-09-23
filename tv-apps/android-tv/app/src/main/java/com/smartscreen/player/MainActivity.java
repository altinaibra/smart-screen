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

    // NDRYSHOJENI me IP-në e serverit .NET
    private static final String SERVER_URL = "http://192.168.1.10:5080/player/";

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

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // Serveri nuk u gjet -> provo përsëri pas 10 sekondash
                if (request.isForMainFrame()) view.postDelayed(() -> view.loadUrl(SERVER_URL), 10000);
            }
        });

        webView.loadUrl(SERVER_URL);
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
