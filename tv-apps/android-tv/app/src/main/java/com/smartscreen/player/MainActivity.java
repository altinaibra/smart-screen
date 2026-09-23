package com.smartscreen.player;

import android.app.Activity;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;

import java.io.File;
import java.util.HashSet;
import java.util.Set;

/**
 * Aplikacion i thjeshtë WebView për Android TV, Sony Bravia (Android/Google TV),
 * Xiaomi Mi Box, Nvidia Shield, Fire TV etj. Hap player-in në ekran të plotë.
 *
 * Pa rrjet: faqja e player-it dhe media (foto/video) ruhen në disk nga {@link OfflineCache},
 * kështu që TV-ja luan përmbajtjen e fundit edhe kur ndizet pa internet.
 */
public class MainActivity extends Activity {

    // Launcher-i lokal (assets/index.html) kërkon adresën e serverit herën e parë, e ruan
    // dhe pastaj hap player-in. Kështu i njëjti APK punon për çdo server pa u rindërtuar.
    private static final String LAUNCHER_URL = "file:///android_asset/index.html";

    private WebView webView;
    private OfflineCache cache;
    private volatile String playerOrigin; // origjina e serverit të player-it që po luhet

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);

        cache = new OfflineCache(new File(getFilesDir(), "offline"));
        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);            // localStorage për deviceKey dhe përmbajtjen offline
        s.setMediaPlaybackRequiresUserGesture(false); // autoplay i videove
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(true);              // launcher-i nga assets (default false në Android 11+)

        webView.addJavascriptInterface(new NativeBridge(), "SmartScreenNative");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                playerOrigin = url != null && url.startsWith("http") ? OfflineCache.origin(Uri.parse(url)) : null;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!"GET".equalsIgnoreCase(request.getMethod())) return null;
                return cache.intercept(request.getUrl(), request.getRequestHeaders());
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // Serveri nuk u gjet dhe player-i s'është në cache -> kthehu te launcher-i, që provon çdo 10 sekonda
                if (request.isForMainFrame()) view.postDelayed(() -> view.loadUrl(LAUNCHER_URL), 5000);
            }
        });

        webView.loadUrl(LAUNCHER_URL);
        hideSystemUi();
    }

    /** Thirret nga JavaScript (launcher-i dhe player.js). */
    private class NativeBridge {
        /** Launcher-i: a mund të hapet player-i pa rrjet për këtë server? */
        @JavascriptInterface
        public boolean hasCachedPlayer(String server) {
            return cache.hasPlayer(server);
        }

        /** player.js: lista e plotë e medias që duhet mbajtur në disk (JSON array me URL). */
        @JavascriptInterface
        public void cacheMedia(String json) {
            String origin = playerOrigin;
            if (origin == null) return;
            Set<String> urls = new HashSet<>();
            try {
                JSONArray arr = new JSONArray(json);
                for (int i = 0; i < arr.length(); i++) {
                    Uri u = Uri.parse(arr.getString(i));
                    // Vetëm media e serverit tonë (jo URL nga faqe të jashtme brenda iframe-ve).
                    if (origin.equals(OfflineCache.origin(u)) && u.getPath() != null && u.getPath().startsWith("/uploads/")) {
                        urls.add(arr.getString(i));
                    }
                }
            } catch (Exception e) {
                return;
            }
            cache.syncMedia(origin, urls);
        }
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
