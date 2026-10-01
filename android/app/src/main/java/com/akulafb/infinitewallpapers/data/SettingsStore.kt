// Durable settings for Infinite Wallpapers.
//
// Config lives as JSON in the app's private files dir and is exposed as a
// StateFlow so the UI recomposes when the background worker changes it. Writes
// are atomic (temp file + rename) and serialized behind a lock. The Serper key
// lives in private SharedPreferences, excluded from backups.

package com.akulafb.infinitewallpapers.data

import android.content.Context
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import java.io.File

private const val MAX_HISTORY = 30
private const val MAX_BLOCKED = 500

class SettingsStore(context: Context) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val configFile = File(context.filesDir, "config.json")
    private val secrets = context.getSharedPreferences("secrets", Context.MODE_PRIVATE)
    private val lock = Any()

    val wallpapersDir: File = File(context.filesDir, "wallpapers").apply { mkdirs() }

    private val _config = MutableStateFlow(load())
    val config: StateFlow<AppConfig> = _config.asStateFlow()

    private val _hasSerperKey = MutableStateFlow(serperKey() != null)
    val hasSerperKey: StateFlow<Boolean> = _hasSerperKey.asStateFlow()

    fun get(): AppConfig = _config.value

    private fun load(): AppConfig {
        if (!configFile.exists()) return AppConfig()
        return try {
            json.decodeFromString<AppConfig>(configFile.readText())
        } catch (e: Exception) {
            // A corrupt file must not crash the app; start fresh but say why.
            Log.e("settings", "Failed to read config; using defaults", e)
            AppConfig()
        }
    }

    // Apply a change to the config, cap the lists, and persist atomically.
    fun update(transform: (AppConfig) -> AppConfig): AppConfig = synchronized(lock) {
        val next = transform(_config.value).let {
            it.copy(history = it.history.take(MAX_HISTORY), blocked = it.blocked.takeLast(MAX_BLOCKED))
        }
        val tmp = File(configFile.parentFile, "config.json.tmp")
        tmp.writeText(json.encodeToString(AppConfig.serializer(), next))
        if (!tmp.renameTo(configFile)) {
            configFile.delete()
            tmp.renameTo(configFile)
        }
        _config.value = next
        next
    }

    // Drop references to cached images that are no longer on disk.
    fun reconcileHistory() {
        val cfg = get()
        val history = cfg.history.filter { File(wallpapersDir, it.file).exists() }
        val currentGone = cfg.current != null && !File(wallpapersDir, cfg.current.file).exists()
        if (history.size == cfg.history.size && !currentGone) return
        update { it.copy(history = history, current = if (currentGone) null else it.current) }
    }

    // ── Serper API key ────────────────────────────────────────────────
    fun serperKey(): String? = secrets.getString("serperKey", null)?.takeIf { it.isNotBlank() }

    fun setSerperKey(key: String) {
        val trimmed = key.trim()
        secrets.edit().apply {
            if (trimmed.isEmpty()) remove("serperKey") else putString("serperKey", trimmed)
        }.apply()
        _hasSerperKey.value = trimmed.isNotEmpty()
    }
}
