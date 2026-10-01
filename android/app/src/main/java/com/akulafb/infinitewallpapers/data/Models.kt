// Shared types for Infinite Wallpapers. Mirrors main/services/types.ts from the
// desktop app, minus the mature-content toggle (Play policy keeps this app SFW).

package com.akulafb.infinitewallpapers.data

import kotlinx.serialization.Serializable

@Serializable
enum class Frequency(val label: String, val intervalMs: Long?) {
    HOURLY("Hourly", 60L * 60 * 1000),
    DAILY("Daily", 24L * 60 * 60 * 1000),
    WEEKLY("Weekly", 7L * 24 * 60 * 60 * 1000),
    MANUAL("Manual", null),
}

// Category hint passed to the search engine (drives Wallhaven category selection).
@Serializable
enum class ThemeCategory { WEB, LANDSCAPE, ANIME, PEOPLE, GENERAL }

// Which Android wallpaper slot(s) a new image goes to.
@Serializable
enum class WallpaperTarget(val label: String) {
    BOTH("Both"),
    HOME("Home"),
    LOCK("Lock"),
}

@Serializable
enum class ThemeSource(val label: String) { SYSTEM("System"), LIGHT("Light"), DARK("Dark") }

@Serializable
data class ThemeConfig(
    val id: String, // preset id or "custom-<ts>"
    val label: String, // human label shown in UI
    val query: String, // the actual search query sent to providers
    val custom: Boolean,
    val category: ThemeCategory,
)

@Serializable
data class WallpaperRecord(
    val id: String, // uuid, also the file basename stem
    val file: String, // basename in the wallpapers dir (e.g. "<uuid>.jpg")
    val imageUrl: String, // remote full-resolution URL it was downloaded from
    val pageUrl: String, // source page / attribution URL
    val provider: String, // "serper" | "wallhaven"
    val width: Int,
    val height: Int,
    val themeLabel: String,
    val appliedAt: Long, // epoch ms
)

@Serializable
data class AppConfig(
    val theme: ThemeConfig = DEFAULT_THEME,
    val frequency: Frequency = Frequency.DAILY,
    val target: WallpaperTarget = WallpaperTarget.BOTH,
    val themeSource: ThemeSource = ThemeSource.SYSTEM,
    val paused: Boolean = false,
    val current: WallpaperRecord? = null,
    val history: List<WallpaperRecord> = emptyList(), // most-recent first, capped
    val blocked: List<String> = emptyList(), // image URLs the user skipped
    val nextRunAt: Long? = null, // epoch ms of the next scheduled change (approximate)
    val themeGrid: List<String> = emptyList(), // preset ids shown in the grid
)

// A search result candidate before it is downloaded.
data class Candidate(
    val imageUrl: String,
    val thumbnailUrl: String,
    val pageUrl: String,
    val provider: String,
    val width: Int,
    val height: Int,
)

val DEFAULT_THEME = ThemeConfig(
    id = "nature",
    label = "Nature & Landscapes",
    query = "breathtaking nature landscape scenery",
    custom = false,
    category = ThemeCategory.LANDSCAPE,
)
