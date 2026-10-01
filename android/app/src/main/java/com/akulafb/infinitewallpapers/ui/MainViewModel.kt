package com.akulafb.infinitewallpapers.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.akulafb.infinitewallpapers.App
import com.akulafb.infinitewallpapers.data.Frequency
import com.akulafb.infinitewallpapers.data.Preset
import com.akulafb.infinitewallpapers.data.THEME_GRID_SIZE
import com.akulafb.infinitewallpapers.data.ThemeCategory
import com.akulafb.infinitewallpapers.data.ThemeConfig
import com.akulafb.infinitewallpapers.data.ThemeSource
import com.akulafb.infinitewallpapers.data.WallpaperRecord
import com.akulafb.infinitewallpapers.data.WallpaperTarget
import com.akulafb.infinitewallpapers.data.presetsFromIds
import com.akulafb.infinitewallpapers.data.shuffleThemes
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

// What is currently running, so the matching button can show a spinner.
sealed interface Busy {
    data object Next : Busy
    data object Skip : Busy
    data object Custom : Busy
    data class Theme(val id: String) : Busy
    data class History(val id: String) : Busy
}

class MainViewModel(app: Application) : AndroidViewModel(app) {
    private val c = (app as App).container
    private val store = c.store

    val config = store.config
    val hasSerperKey = store.hasSerperKey
    val wallpapersDir: File = store.wallpapersDir

    val grid: StateFlow<List<Preset>> = config
        .map { presetsFromIds(it.themeGrid, THEME_GRID_SIZE) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, presetsFromIds(config.value.themeGrid, THEME_GRID_SIZE))

    private val _busy = MutableStateFlow<Busy?>(null)
    val busy: StateFlow<Busy?> = _busy.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors = _errors.asSharedFlow()

    // Runs one wallpaper action at a time and reports failures as a message.
    private fun run(kind: Busy, restartClock: Boolean = true, action: suspend () -> Unit) {
        if (_busy.value != null) return
        _busy.value = kind
        viewModelScope.launch {
            try {
                action()
                if (restartClock) c.scheduler.reschedule()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _errors.tryEmit(e.message ?: "Something went wrong. Please try again.")
            } finally {
                _busy.value = null
            }
        }
    }

    fun selectPreset(preset: Preset) = run(Busy.Theme(preset.id)) {
        store.update { it.copy(theme = preset.toTheme()) }
        c.wallpapers.applyNext("theme")
    }

    fun applyCustom(description: String, onDone: () -> Unit) {
        val query = description.trim()
        if (query.isEmpty()) return
        run(Busy.Custom) {
            val theme = ThemeConfig(
                id = "custom-${System.currentTimeMillis()}",
                label = query.take(60),
                query = query,
                custom = true,
                category = ThemeCategory.WEB,
            )
            store.update { it.copy(theme = theme) }
            c.wallpapers.applyNext("custom")
            onDone()
        }
    }

    fun next() = run(Busy.Next) { c.wallpapers.applyNext("manual") }

    fun skip() = run(Busy.Skip) { c.wallpapers.skipCurrent() }

    fun applyHistory(record: WallpaperRecord) = run(Busy.History(record.id), restartClock = false) {
        c.wallpapers.applyFromHistory(record.id)
    }

    fun shuffle() {
        val next = shuffleThemes(THEME_GRID_SIZE, grid.value.map { it.id })
        store.update { it.copy(themeGrid = next.map { p -> p.id }) }
    }

    fun togglePause() {
        store.update { it.copy(paused = !it.paused) }
        c.scheduler.reschedule()
    }

    fun setFrequency(frequency: Frequency) {
        store.update { it.copy(frequency = frequency) }
        c.scheduler.reschedule()
    }

    fun setTarget(target: WallpaperTarget) = store.update { it.copy(target = target) }

    fun setThemeSource(source: ThemeSource) = store.update { it.copy(themeSource = source) }

    fun setSerperKey(key: String) = store.setSerperKey(key)

    suspend fun thumbnail(preset: Preset): String? = c.thumbnails.get(preset)

    fun cachedThumbnail(preset: Preset): String? = c.thumbnails.cached(preset.id)
}
