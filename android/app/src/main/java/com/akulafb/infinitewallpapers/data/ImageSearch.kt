// Multi-source image search. Serper.dev provides whole-web Google Images results
// (needs a user-supplied API key); Wallhaven is a free, no-key wallpaper source.
// Results are merged, filtered for the phone's screen shape, and de-duplicated.
// Ported from main/services/image-search.ts; always SFW on Android.

package com.akulafb.infinitewallpapers.data

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

// Stock/preview domains that watermark their images — excluded from web results.
private val BLOCKED_DOMAINS = listOf(
    "shutterstock", "gettyimages.", "istockphoto.com", "alamy.com", "dreamstime.com",
    "depositphotos.com", "123rf.com", "stock.adobe.com", "vecteezy.com", "canstockphoto.com",
    "agefotostock.com", "pinterest.", "lookaside.", "fbcdn.net",
)

private fun hostBlocked(url: String): Boolean {
    val lower = url.lowercase()
    return BLOCKED_DOMAINS.any { lower.contains(it) }
}

// Web images are cropped to the screen, so accept anything within this
// multiplicative band of the screen's aspect (9:19.5 => ~0.31..0.69).
private const val ASPECT_TOLERANCE = 1.5

private fun suitableForScreen(c: Candidate, screen: ScreenSize): Boolean {
    if (c.width < screen.minImageWidth || c.height <= 0) return false
    val ratio = c.width.toDouble() / c.height
    return ratio >= screen.aspect / ASPECT_TOLERANCE && ratio <= screen.aspect * ASPECT_TOLERANCE
}

// Keeps one search well inside Wallhaven's 45 requests/minute limit.
private const val MAX_WALLHAVEN_ATTEMPTS = 6

// Wallhaven indexes a fixed set of ratio buckets; snap to the nearest by
// log-distance and add a neighbour so niche buckets still return results.
private val WALLHAVEN_BUCKETS = listOf(
    9.0 / 21 to "9x21,9x18",
    9.0 / 19.5 to "9x18,9x16",
    9.0 / 18 to "9x18,9x16",
    9.0 / 16 to "9x16,10x16",
    10.0 / 16 to "10x16,9x16",
    3.0 / 4 to "3x4,10x16",
)

private fun wallhavenRatios(aspect: Double): String =
    WALLHAVEN_BUCKETS.minBy { abs(ln(aspect / it.first)) }.second

private fun wallhavenCategories(category: ThemeCategory): String = when (category) {
    ThemeCategory.ANIME -> "010"
    ThemeCategory.PEOPLE -> "001"
    ThemeCategory.LANDSCAPE, ThemeCategory.GENERAL -> "100"
    ThemeCategory.WEB -> "111" // web/custom — search everything
}

private val FILLER_WORDS = Regex(
    "\\b(4k|8k|hd|wallpaper|wallpapers|background|backgrounds|high resolution|hires|desktop|phone|mobile)\\b",
    RegexOption.IGNORE_CASE,
)

private fun cleanWallhavenQuery(raw: String): String =
    raw.replace(FILLER_WORDS, " ").replace(Regex("\\s+"), " ").trim().ifEmpty { raw.trim() }

// Interleave two lists so results from both providers are represented near the top.
private fun <T> interleave(a: List<T>, b: List<T>): List<T> = buildList {
    for (i in 0 until max(a.size, b.size)) {
        if (i < a.size) add(a[i])
        if (i < b.size) add(b[i])
    }
}

class ImageSearch(private val http: OkHttpClient) {
    private val json = Json { ignoreUnknownKeys = true }

    // ── Serper.dev (Google Images, whole web) ────────────────────────
    private fun searchSerper(apiKey: String, query: String): List<Candidate> {
        val body = buildJsonObject {
            put("q", "$query phone wallpaper 4k")
            put("num", 40)
            put("gl", "us")
            put("hl", "en")
            put("safe", "active")
        }.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("https://google.serper.dev/images")
            .header("X-API-KEY", apiKey)
            .post(body)
            .build()
        http.newCall(request).execute().use { res ->
            if (!res.isSuccessful) throw IllegalStateException("Serper error: ${res.code}")
            val root = json.parseToJsonElement(res.body!!.string()).jsonObject
            val images = root["images"]?.jsonArray ?: return emptyList()
            return images.mapNotNull { el ->
                val img = el.jsonObject
                val imageUrl = img.str("imageUrl") ?: return@mapNotNull null
                Candidate(
                    imageUrl = imageUrl,
                    thumbnailUrl = img.str("thumbnailUrl") ?: imageUrl,
                    pageUrl = img.str("link") ?: imageUrl,
                    provider = "serper",
                    width = img["imageWidth"]?.jsonPrimitive?.intOrNull ?: 0,
                    height = img["imageHeight"]?.jsonPrimitive?.intOrNull ?: 0,
                )
            }
        }
    }

    // ── Wallhaven (free, no key) ─────────────────────────────────────
    // `ratios` null means any shape (used for landscape theme-card thumbnails).
    private fun wallhavenOnce(query: String, category: ThemeCategory, ratios: String?, atleast: String?): List<Candidate> {
        val url = "https://wallhaven.cc/api/v1/search".toHttpUrl().newBuilder().apply {
            addQueryParameter("q", query)
            addQueryParameter("categories", wallhavenCategories(category))
            addQueryParameter("purity", "100") // SFW only
            addQueryParameter("sorting", "relevance")
            addQueryParameter("ai_art_filter", "1")
            ratios?.let { addQueryParameter("ratios", it) }
            atleast?.let { addQueryParameter("atleast", it) }
        }.build()
        val request = Request.Builder().url(url).header("User-Agent", "InfiniteWallpapers-Android/1.0").build()
        http.newCall(request).execute().use { res ->
            if (!res.isSuccessful) throw IllegalStateException("Wallhaven error: ${res.code}")
            val root = json.parseToJsonElement(res.body!!.string()).jsonObject
            val items = root["data"]?.jsonArray ?: return emptyList()
            return items.mapNotNull { el ->
                val it = el.jsonObject
                val path = it.str("path") ?: return@mapNotNull null
                val thumbs = it["thumbs"] as? JsonObject
                Candidate(
                    imageUrl = path,
                    thumbnailUrl = thumbs?.str("large") ?: thumbs?.str("small") ?: path,
                    pageUrl = it.str("url") ?: path,
                    provider = "wallhaven",
                    width = it["dimension_x"]?.jsonPrimitive?.intOrNull ?: 0,
                    height = it["dimension_y"]?.jsonPrimitive?.intOrNull ?: 0,
                )
            }
        }
    }

    // Wallhaven ANDs every word, so long queries often match nothing. Try the
    // full query, then each neighbouring word pair, then single words. Leading
    // adjectives ("breathtaking") rarely match, so pairs beat a plain prefix.
    private fun searchWallhaven(query: String, category: ThemeCategory, ratios: String?, atleast: String?): List<Candidate> {
        val cleaned = cleanWallhavenQuery(query)
        val words = cleaned.split(Regex("\\s+")).filter { it.isNotEmpty() }
        val attempts = buildList {
            add(cleaned)
            if (words.size > 2) words.windowed(2).forEach { add(it.joinToString(" ")) }
            if (words.size > 1) addAll(words.reversed())
        }.distinct().take(MAX_WALLHAVEN_ATTEMPTS)
        for (q in attempts) {
            try {
                val results = wallhavenOnce(q, category, ratios, atleast)
                if (results.isNotEmpty()) return results
            } catch (e: Exception) {
                Log.w("search", "Wallhaven attempt failed for \"$q\"", e)
            }
        }
        return emptyList()
    }

    // Cheap single-thumbnail lookup for theme cards. Tries the last words of the
    // query too, so specific phrases still yield art.
    suspend fun wallhavenThumbnail(query: String, category: ThemeCategory): String? = withContext(Dispatchers.IO) {
        val words = query.trim().split(Regex("\\s+"))
        val attempts = buildList {
            add(query)
            if (words.size > 2) add(words.takeLast(2).joinToString(" "))
            if (words.size > 1) add(words.last())
        }
        attempts.firstNotNullOfOrNull { q ->
            searchWallhaven(q, category, ratios = null, atleast = null).firstOrNull()?.thumbnailUrl
        }
    }

    suspend fun search(
        query: String,
        category: ThemeCategory,
        blocked: Collection<String>,
        apiKey: String?,
        screen: ScreenSize,
    ): List<Candidate> = withContext(Dispatchers.IO) {
        val atleast = "${screen.minImageWidth}x${min(1920, (screen.minImageWidth / screen.aspect).roundToInt())}"
        val (serper, wallhaven) = coroutineScope {
            val s = async {
                if (apiKey == null) emptyList()
                else runCatching { searchSerper(apiKey, query) }
                    .onFailure { Log.e("search", "Serper failed", it) }
                    .getOrDefault(emptyList())
            }
            val w = async {
                // Portrait first; fall back to any shape (it gets center-cropped).
                searchWallhaven(query, category, wallhavenRatios(screen.aspect), atleast)
                    .ifEmpty { searchWallhaven(query, category, ratios = null, atleast = null) }
            }
            s.await() to w.await()
        }

        val blockedSet = blocked.toHashSet()
        val seen = HashSet<String>()
        interleave(serper, wallhaven).filter { c ->
            if (c.imageUrl in seen || c.imageUrl in blockedSet) return@filter false
            if (hostBlocked(c.pageUrl) || hostBlocked(c.imageUrl)) return@filter false
            // Wallhaven already enforces size/ratio; trust it even if dims are 0.
            if (c.provider != "wallhaven" && !suitableForScreen(c, screen)) return@filter false
            seen.add(c.imageUrl)
        }
    }
}

private fun JsonObject.str(key: String): String? =
    this[key]?.jsonPrimitive?.takeIf { it.isString }?.content
