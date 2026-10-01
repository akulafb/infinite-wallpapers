// Preview images for theme cards, looked up once per preset on Wallhaven and
// cached in SharedPreferences. Lookups run one at a time to stay well inside
// Wallhaven's rate limit (45 requests/minute).

package com.akulafb.infinitewallpapers.data

import android.content.Context
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class ThemeThumbnails(context: Context, private val search: ImageSearch) {
    private val prefs = context.getSharedPreferences("theme-thumbnails", Context.MODE_PRIVATE)
    private val mutex = Mutex()

    fun cached(id: String): String? = prefs.getString(id, null)

    suspend fun get(preset: Preset): String? {
        cached(preset.id)?.let { return it }
        return mutex.withLock {
            cached(preset.id) ?: runCatching { search.wallhavenThumbnail(preset.query, preset.category) }
                .getOrNull()
                ?.also { prefs.edit().putString(preset.id, it).apply() }
        }
    }
}
