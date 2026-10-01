package com.akulafb.infinitewallpapers

import android.app.Application
import android.content.Context
import com.akulafb.infinitewallpapers.data.ImageSearch
import com.akulafb.infinitewallpapers.data.RotationScheduler
import com.akulafb.infinitewallpapers.data.SettingsStore
import com.akulafb.infinitewallpapers.data.ThemeThumbnails
import com.akulafb.infinitewallpapers.data.WallpaperService
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

// Process-wide singletons, shared by the UI and the background worker.
class AppContainer(context: Context) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    val store = SettingsStore(context)
    val search = ImageSearch(http)
    val wallpapers = WallpaperService(context, store, search, http)
    val scheduler = RotationScheduler(context, store)
    val thumbnails = ThemeThumbnails(context, search)
}

class App : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        container.store.reconcileHistory()
        container.scheduler.ensureScheduled()
    }
}
