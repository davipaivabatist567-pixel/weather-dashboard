package com.davi.meutiktok;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.NumberFormat;
import java.util.Locale;

/** Confere as visualizações a cada ~15 min e avisa a cada 100 novas. */
public class ViewsJobService extends JobService {
    static final String DATA_URL = "https://davipaivabatist567-pixel.github.io/weather-dashboard/data.json";
    static final int STEP = 100;
    private static final int JOB_ID = 100;
    private static final String CHANNEL = "views";

    static void schedule(Context ctx) {
        JobScheduler js = ctx.getSystemService(JobScheduler.class);
        if (js.getPendingJob(JOB_ID) != null) return;
        js.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(ctx, ViewsJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build());
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            try {
                check();
            } catch (Exception ignored) {
                // Sem internet ou site ainda não configurado: tenta de novo na próxima vez.
            }
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    private void check() throws Exception {
        JSONObject data = new JSONObject(get(DATA_URL + "?t=" + System.currentTimeMillis()));
        if (!data.optBoolean("connected")) return;
        long views = data.getJSONObject("totals").optLong("views");
        long milestone = views / STEP;

        SharedPreferences prefs = getSharedPreferences("views", MODE_PRIVATE);
        long last = prefs.getLong("milestone", -1);
        if (last >= 0 && milestone > last) {
            NumberFormat nf = NumberFormat.getInstance(new Locale("pt", "BR"));
            long gained = (milestone - last) * STEP;
            String title = (gained == STEP ? "🎉 +" : "🚀 +") + nf.format(gained)
                    + " visualizações! Total: " + nf.format(milestone * STEP);
            notify(title, "Agora você tem " + nf.format(views) + " visualizações no total." + topVideo(data));
        }
        if (milestone > last) prefs.edit().putLong("milestone", milestone).apply();
    }

    private static String topVideo(JSONObject data) {
        JSONArray videos = data.optJSONArray("videos");
        if (videos == null || videos.length() == 0) return "";
        JSONObject best = null;
        for (int i = 0; i < videos.length(); i++) {
            JSONObject v = videos.optJSONObject(i);
            if (v != null && (best == null || v.optLong("view_count") > best.optLong("view_count"))) best = v;
        }
        String title = best.optString("title", "");
        if (title.isEmpty()) title = best.optString("video_description", "");
        if (title.isEmpty()) return "";
        return "\nVídeo mais visto: " + (title.length() > 60 ? title.substring(0, 60) + "…" : title);
    }

    private void notify(String title, String text) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Visualizações", NotificationManager.IMPORTANCE_HIGH));
        }
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this).setPriority(Notification.PRIORITY_HIGH);
        nm.notify((int) (System.currentTimeMillis() / 1000), b
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build());
    }

    private static String get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(15000);
        c.setUseCaches(false);
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } finally {
            c.disconnect();
        }
    }
}
