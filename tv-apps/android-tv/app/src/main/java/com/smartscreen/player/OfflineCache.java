package com.smartscreen.player;

import android.net.Uri;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Cache në disk që player-i të punojë pa rrjet:
 * <ul>
 *   <li>/player/*  – rrjeti së pari (përditësimet vijnë menjëherë), disku kur s'ka rrjet</li>
 *   <li>/uploads/* – disku së pari (emrat janë GUID dhe nuk ndryshojnë); shkarkohen paraprakisht
 *       nga {@link #syncMedia} sipas listës që dërgon player.js</li>
 * </ul>
 * Videot kërkojnë "Range", prandaj nga disku kthehet 206 Partial Content.
 */
final class OfflineCache {
    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 15000;
    private static final Pattern RANGE = Pattern.compile("bytes=(\\d*)-(\\d*)");

    private final File shellDir;
    private final File mediaDir;
    // Një shkarkim në një kohë: TV-të me rrjet të dobët nuk mbingarkohen dhe videoja që luhet s'ngec.
    private final ExecutorService downloads = Executors.newSingleThreadExecutor();
    private final Set<String> queued = new HashSet<>();

    OfflineCache(File root) {
        shellDir = new File(root, "player");
        mediaDir = new File(root, "media");
        shellDir.mkdirs();
        mediaDir.mkdirs();
    }

    static String origin(Uri u) {
        if (u == null || u.getScheme() == null || u.getHost() == null) return null;
        String o = u.getScheme().toLowerCase(Locale.ROOT) + "://" + u.getHost().toLowerCase(Locale.ROOT);
        return u.getPort() > 0 ? o + ":" + u.getPort() : o;
    }

    boolean hasPlayer(String server) {
        if (server == null) return false;
        return shellFile(origin(Uri.parse(server)), "/player/index.html").exists();
    }

    WebResourceResponse intercept(Uri url, Map<String, String> headers) {
        String scheme = url.getScheme();
        String path = url.getPath();
        if (path == null || scheme == null || !scheme.startsWith("http")) return null;
        String origin = origin(url);

        if (path.startsWith("/uploads/")) return media(url, origin, headers);
        if (path.equals("/player") || path.startsWith("/player/")) return shell(url, origin, path);
        return null;
    }

    // ------------------------------------------------------------------ /player/*

    private WebResourceResponse shell(Uri url, String origin, String path) {
        if (path.equals("/player") || path.endsWith("/")) path = "/player/index.html";
        File file = shellFile(origin, path);
        String mime = mimeOf(path);

        HttpURLConnection conn = null;
        try {
            conn = open(origin + path);
            if (conn.getResponseCode() == 200) {
                byte[] body = readAll(conn.getInputStream());
                writeAtomically(file, new ByteArrayInputStream(body));
                return response(mime, 200, "OK", new ByteArrayInputStream(body), body.length);
            }
        } catch (IOException ignored) {
            // pa rrjet -> disku më poshtë
        } finally {
            if (conn != null) conn.disconnect();
        }

        if (!file.exists()) return null; // le WebView-in të tregojë gabimin -> launcher-i
        try {
            return response(mime, 200, "OK", new FileInputStream(file), file.length());
        } catch (IOException e) {
            return null;
        }
    }

    // ------------------------------------------------------------------ /uploads/*

    private WebResourceResponse media(Uri url, String origin, Map<String, String> headers) {
        String full = origin + url.getPath();
        File file = mediaFile(full);
        if (!file.exists()) {
            enqueue(full);
            return null; // këtë herë nga rrjeti; herën tjetër nga disku
        }
        String mime = mimeOf(url.getPath());
        try {
            String range = header(headers, "Range");
            long size = file.length();
            Matcher m = range == null ? null : RANGE.matcher(range);
            if (m == null || !m.find()) return response(mime, 200, "OK", new FileInputStream(file), size);

            long start, end;
            if (m.group(1).isEmpty()) {           // bytes=-500 (500 bajtët e fundit)
                start = Math.max(0, size - Long.parseLong(m.group(2)));
                end = size - 1;
            } else {
                start = Long.parseLong(m.group(1));
                end = m.group(2).isEmpty() ? size - 1 : Math.min(Long.parseLong(m.group(2)), size - 1);
            }
            if (start >= size || start > end) return null;

            InputStream in = new FileInputStream(file);
            skipFully(in, start);
            WebResourceResponse res = response(mime, 206, "Partial Content", new Limited(in, end - start + 1), end - start + 1);
            res.getResponseHeaders().put("Content-Range", "bytes " + start + "-" + end + "/" + size);
            return res;
        } catch (IOException | NumberFormatException e) {
            return null;
        }
    }

    /** Mban në disk vetëm median që përdoret: shkarkon ato që mungojnë, fshin të tjerat. */
    void syncMedia(String origin, Set<String> urls) {
        Set<String> wanted = new HashSet<>();
        for (String u : urls) wanted.add(mediaFile(u).getName());
        File[] files = mediaDir.listFiles();
        if (files != null) {
            for (File f : files) if (!wanted.contains(f.getName()) && !f.getName().endsWith(".tmp")) f.delete();
        }
        for (String u : urls) if (!mediaFile(u).exists()) enqueue(u);
    }

    private void enqueue(final String url) {
        synchronized (queued) {
            if (!queued.add(url)) return;
        }
        downloads.execute(() -> {
            HttpURLConnection conn = null;
            try {
                File file = mediaFile(url);
                if (file.exists()) return;
                conn = open(url);
                if (conn.getResponseCode() == 200) writeAtomically(file, conn.getInputStream());
            } catch (IOException ignored) {
                // provohet sërish herën tjetër që kërkohet
            } finally {
                if (conn != null) conn.disconnect();
                synchronized (queued) { queued.remove(url); }
            }
        });
    }

    // ------------------------------------------------------------------ ndihmëse

    private File shellFile(String origin, String path) { return new File(shellDir, hash(origin + path)); }

    private File mediaFile(String url) {
        Uri u = Uri.parse(url);
        String path = u.getPath() == null ? "" : u.getPath();
        String ext = MimeTypeMap.getFileExtensionFromUrl(path);
        return new File(mediaDir, hash(origin(u) + path) + (ext == null || ext.isEmpty() ? "" : "." + ext));
    }

    private static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(READ_TIMEOUT_MS);
        conn.setUseCaches(false);
        return conn;
    }

    private static WebResourceResponse response(String mime, int status, String reason, InputStream body, long length) {
        Map<String, String> h = new HashMap<>();
        h.put("Accept-Ranges", "bytes");
        h.put("Content-Length", String.valueOf(length));
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Cache-Control", "no-cache");
        String encoding = mime.startsWith("text/") || mime.endsWith("javascript") ? "utf-8" : null;
        return new WebResourceResponse(mime, encoding, status, reason, h, body);
    }

    private static String mimeOf(String path) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(path);
        if (ext != null) {
            ext = ext.toLowerCase(Locale.ROOT);
            if (ext.equals("js")) return "application/javascript";
            if (ext.equals("css")) return "text/css";
            if (ext.equals("html")) return "text/html";
            if (ext.equals("svg")) return "image/svg+xml";
            String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if (m != null) return m;
        }
        return "application/octet-stream";
    }

    private static String header(Map<String, String> headers, String name) {
        if (headers == null) return null;
        for (Map.Entry<String, String> e : headers.entrySet()) {
            if (e.getKey() != null && e.getKey().equalsIgnoreCase(name)) return e.getValue();
        }
        return null;
    }

    private static void writeAtomically(File target, InputStream in) throws IOException {
        File tmp = new File(target.getPath() + ".tmp");
        try (OutputStream out = new FileOutputStream(tmp)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        } finally {
            in.close();
        }
        if (!tmp.renameTo(target)) {
            tmp.delete();
            throw new IOException("rename failed");
        }
    }

    private static byte[] readAll(InputStream in) throws IOException {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            in.close();
        }
    }

    private static void skipFully(InputStream in, long n) throws IOException {
        while (n > 0) {
            long s = in.skip(n);
            if (s <= 0) throw new IOException("skip failed");
            n -= s;
        }
    }

    private static String hash(String s) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-1").digest(s.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format(Locale.ROOT, "%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(s.hashCode());
        }
    }

    /** Lexon vetëm {@code remaining} bajt (për përgjigjet 206). */
    private static final class Limited extends FilterInputStream {
        private long remaining;

        Limited(InputStream in, long remaining) {
            super(in);
            this.remaining = remaining;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int b = super.read();
            if (b >= 0) remaining--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int n = super.read(b, off, (int) Math.min(len, remaining));
            if (n > 0) remaining -= n;
            return n;
        }
    }
}
