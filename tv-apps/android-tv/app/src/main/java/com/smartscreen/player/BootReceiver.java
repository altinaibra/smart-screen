package com.smartscreen.player;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Nis player-in automatikisht pas ndezjes së pajisjes. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Intent start = new Intent(context, MainActivity.class);
            start.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(start);
        }
    }
}
