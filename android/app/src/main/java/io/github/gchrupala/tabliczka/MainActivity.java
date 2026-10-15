package io.github.gchrupala.tabliczka;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

/**
 * Shows the web app from the APK's assets in a full-screen web view.
 *
 * The pages are served under https://appassets.androidplatform.net, a host
 * Android reserves for this purpose, so the app has a stable web origin and
 * its saved progress (localStorage) survives updates.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(getColor(R.color.paper));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                return HOST.equals(url.getHost()) ? loadAsset(url.getPath()) : null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Stay inside the app: it has no links to other sites.
                return !HOST.equals(request.getUrl().getHost());
            }
        });

        webView.loadUrl(START_URL);
    }

    private WebResourceResponse loadAsset(String path) {
        String name = (path == null || path.equals("/")) ? "index.html" : path.substring(1);
        String type = mimeType(name);
        try {
            InputStream data = getAssets().open(name);
            return new WebResourceResponse(type, type.startsWith("font/") || type.startsWith("image/") ? null : "utf-8", data);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mimeType(String name) {
        if (name.endsWith(".html")) return "text/html";
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".woff2")) return "font/woff2";
        if (name.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    // Back closes the settings panel if it is open; otherwise it leaves the app.
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        webView.evaluateJavascript(
                "window.closeParentPanel ? window.closeParentPanel() : false",
                closed -> {
                    if (!"true".equals(closed)) MainActivity.super.onBackPressed();
                });
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
