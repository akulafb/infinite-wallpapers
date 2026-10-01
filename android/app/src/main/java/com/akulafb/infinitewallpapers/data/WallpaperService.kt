// Orchestrates the full "change the wallpaper" flow: search → pick a fresh
// candidate → download → crop to the screen → set → record in config.
// Ported from main/services/wallpaper-service.ts and wallpaper-download.ts.

package com.akulafb.infinitewallpapers.data

import android.app.WallpaperManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapRegionDecoder
import android.graphics.Matrix
import android.graphics.Rect
import android.hardware.display.DisplayManager
import android.util.Log
import android.view.Display
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.UUID
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val MAX_CACHED_FILES = 40
private const val MIN_BYTES = 20 * 1024 // reject tiny "images" that are really errors/thumbs
private const val MAX_BYTES = 25L * 1024 * 1024 // any search hit can be huge; cap what we download

// Physical screen size in portrait orientation, plus the derived search hints.
data class ScreenSize(val width: Int, val height: Int) {
    val aspect: Double get() = width.toDouble() / height
    // Don't demand more pixels than the screen has, but never accept tiny images.
    val minImageWidth: Int get() = max(720, min(width, 1080))
}

class NoImagesException :
    Exception("No suitable wallpapers were found for this theme. Try a different theme.")

class WallpaperNotAllowedException :
    Exception("This phone does not allow apps to change the wallpaper (it may be managed by work or school).")

class WallpaperService(
    private val context: Context,
    private val store: SettingsStore,
    private val search: ImageSearch,
    private val http: OkHttpClient,
) {
    // Serializes applies so the background worker and a button tap never overlap.
    private val mutex = Mutex()

    // Physical panel size. Read from the display mode rather than WindowManager so
    // it works from the Application context, which is all the worker has.
    fun screenSize(): ScreenSize {
        val display = context.getSystemService(DisplayManager::class.java).getDisplay(Display.DEFAULT_DISPLAY)
        val mode = display?.mode
        val (w, h) = if (mode != null && mode.physicalWidth > 0) {
            mode.physicalWidth to mode.physicalHeight
        } else {
            context.resources.displayMetrics.let { it.widthPixels to it.heightPixels }
        }
        return ScreenSize(min(w, h), max(w, h))
    }

    suspend fun applyNext(reason: String): WallpaperRecord = mutex.withLock { applyNextLocked(reason) }

    // Scheduled path. If the user changed the wallpaper moments ago (the worker
    // was waiting on the lock), keep their pick instead of replacing it at once.
    suspend fun applyScheduled(minGapMs: Long): WallpaperRecord? = mutex.withLock {
        val last = store.get().current?.appliedAt ?: 0L
        if (System.currentTimeMillis() - last < minGapMs) null else applyNextLocked("scheduled")
    }

    private suspend fun applyNextLocked(reason: String): WallpaperRecord {
        checkAllowed()
        val cfg = store.get()
        val candidates = search.search(
            query = cfg.theme.query,
            category = cfg.theme.category,
            blocked = cfg.blocked,
            apiKey = store.serperKey(),
            screen = screenSize(),
        )
        if (candidates.isEmpty()) throw NoImagesException()

        val recent = (listOfNotNull(cfg.current?.imageUrl) + cfg.history.take(10).map { it.imageUrl }).toSet()
        val (seen, fresh) = candidates.partition { it.imageUrl in recent }
        val ordered = fresh.shuffled() + seen.shuffled()

        var lastError: Exception? = null
        for (candidate in ordered.take(12)) {
            try {
                val file = download(candidate.imageUrl)
                try {
                    setWallpaper(file, cfg.target)
                } catch (e: Exception) {
                    file.delete()
                    throw e
                }
                val record = WallpaperRecord(
                    id = file.nameWithoutExtension,
                    file = file.name,
                    imageUrl = candidate.imageUrl,
                    pageUrl = candidate.pageUrl,
                    provider = candidate.provider,
                    width = candidate.width,
                    height = candidate.height,
                    themeLabel = cfg.theme.label,
                    appliedAt = System.currentTimeMillis(),
                )
                store.update { c ->
                    c.copy(current = record, history = listOf(record) + c.history.filter { it.imageUrl != record.imageUrl })
                }
                pruneCache()
                Log.i("wallpaper", "Applied new wallpaper ($reason, ${record.provider})")
                return record
            } catch (e: SecurityException) {
                throw WallpaperNotAllowedException() // no point trying other images
            } catch (e: Exception) {
                lastError = e
                Log.w("wallpaper", "Candidate failed, trying next: ${candidate.imageUrl}", e)
            }
        }
        throw lastError ?: IllegalStateException("Could not download a suitable wallpaper. Please try again.")
    }

    // Re-apply a previously downloaded wallpaper from history.
    suspend fun applyFromHistory(id: String): WallpaperRecord = mutex.withLock {
        val cfg = store.get()
        val record = cfg.history.find { it.id == id }
            ?: throw IllegalStateException("That wallpaper is no longer available.")
        checkAllowed()
        try {
            setWallpaper(File(store.wallpapersDir, record.file), cfg.target)
        } catch (e: SecurityException) {
            throw WallpaperNotAllowedException()
        }
        val updated = record.copy(appliedAt = System.currentTimeMillis())
        store.update { c -> c.copy(current = updated, history = listOf(updated) + c.history.filter { it.id != id }) }
        updated
    }

    // Block the current image so it won't be picked again, then rotate.
    suspend fun skipCurrent(): WallpaperRecord {
        store.get().current?.let { cur -> store.update { it.copy(blocked = it.blocked + cur.imageUrl) } }
        return applyNext("skip")
    }

    private fun checkAllowed() {
        val wm = WallpaperManager.getInstance(context)
        if (!wm.isWallpaperSupported || !wm.isSetWallpaperAllowed) throw WallpaperNotAllowedException()
    }

    // Streams to disk with a size cap, then checks the bytes really are an image.
    private suspend fun download(imageUrl: String): File = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(imageUrl)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android) InfiniteWallpapers/1.0")
            .build()
        val tmp = File(store.wallpapersDir, "${UUID.randomUUID()}.part")
        try {
            http.newCall(request).execute().use { res ->
                if (!res.isSuccessful) throw IllegalStateException("Download failed: ${res.code}")
                val body = res.body ?: throw IllegalStateException("Download was empty")
                if (body.contentLength() > MAX_BYTES) throw IllegalStateException("Image is too large")
                var total = 0L
                body.byteStream().use { input ->
                    tmp.outputStream().use { output ->
                        val buf = ByteArray(64 * 1024)
                        while (true) {
                            val n = input.read(buf)
                            if (n < 0) break
                            total += n
                            if (total > MAX_BYTES) throw IllegalStateException("Image is too large")
                            output.write(buf, 0, n)
                        }
                    }
                }
                if (total < MIN_BYTES) throw IllegalStateException("Downloaded image is too small")
                val head = ByteArray(12).also { h -> tmp.inputStream().use { it.read(h) } }
                val contentType = res.header("Content-Type").orEmpty()
                val ext = detectExtension(head)
                    ?: if (contentType.startsWith("image/")) ".jpg"
                    else throw IllegalStateException("Not an image (content-type: ${contentType.ifEmpty { "unknown" }})")
                File(store.wallpapersDir, tmp.nameWithoutExtension + ext).also { tmp.renameTo(it) }
            }
        } finally {
            tmp.delete() // no-op after a successful rename
        }
    }

    // Decode only the centre region that fills the screen, downsampled, so even
    // 8K images stay small in memory. EXIF rotation is applied afterwards; a
    // centred crop is symmetric, so rotating only swaps the region's width/height.
    @Suppress("DEPRECATION") // BitmapRegionDecoder.newInstance(String, Boolean) is the only API-26 form
    private suspend fun setWallpaper(file: File, target: WallpaperTarget) = withContext(Dispatchers.IO) {
        val screen = screenSize()
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IllegalStateException("Could not read image")

        val rotation = runCatching { ExifInterface(file).rotationDegrees }.getOrDefault(0)
        val swapped = rotation == 90 || rotation == 270
        val (ow, oh) = if (swapped) bounds.outHeight to bounds.outWidth else bounds.outWidth to bounds.outHeight

        val scale = max(screen.width.toDouble() / ow, screen.height.toDouble() / oh)
        val cropW = min(ow, (screen.width / scale).roundToInt())
        val cropH = min(oh, (screen.height / scale).roundToInt())
        val (rw, rh) = if (swapped) cropH to cropW else cropW to cropH
        val rect = Rect((bounds.outWidth - rw) / 2, (bounds.outHeight - rh) / 2, 0, 0)
            .apply { right = left + rw; bottom = top + rh }

        // Largest power-of-two downsample that still covers the screen.
        var sample = 1
        while (scale * sample * 2 <= 1.0) sample *= 2

        val decoder = BitmapRegionDecoder.newInstance(file.path, false)
            ?: throw IllegalStateException("Could not decode image")
        val region = try {
            decoder.decodeRegion(rect, BitmapFactory.Options().apply { inSampleSize = sample })
        } finally {
            decoder.recycle()
        } ?: throw IllegalStateException("Could not decode image")

        val matrix = Matrix()
        if (rotation != 0) matrix.postRotate(rotation.toFloat())
        val outW = if (swapped) region.height else region.width
        if (outW > screen.width) matrix.postScale(screen.width.toFloat() / outW, screen.width.toFloat() / outW)
        val final = if (matrix.isIdentity) region
        else Bitmap.createBitmap(region, 0, 0, region.width, region.height, matrix, true).also {
            if (it !== region) region.recycle()
        }

        val wm = WallpaperManager.getInstance(context)
        try {
            when (target) {
                WallpaperTarget.BOTH ->
                    wm.setBitmap(final, null, true, WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK)
                WallpaperTarget.LOCK -> wm.setBitmap(final, null, true, WallpaperManager.FLAG_LOCK)
                WallpaperTarget.HOME -> {
                    // A lock screen with no image of its own mirrors the home one, so
                    // pin the previous image there first to keep "Home only" true.
                    val previous = store.get().current?.let { File(store.wallpapersDir, it.file) }
                    if (wm.getWallpaperId(WallpaperManager.FLAG_LOCK) < 0 && previous?.exists() == true && previous != file) {
                        previous.inputStream().use { wm.setStream(it, null, true, WallpaperManager.FLAG_LOCK) }
                    }
                    wm.setBitmap(final, null, true, WallpaperManager.FLAG_SYSTEM)
                }
            }
        } finally {
            final.recycle()
        }
    }

    // Keep only the newest MAX_CACHED_FILES images, never deleting one that
    // config still references.
    private fun pruneCache() {
        val files = store.wallpapersDir.listFiles() ?: return
        if (files.size <= MAX_CACHED_FILES) return
        val cfg = store.get()
        val keep = cfg.history.map { it.file }.toMutableSet().apply { cfg.current?.let { add(it.file) } }
        files.sortedByDescending { it.lastModified() }
            .drop(MAX_CACHED_FILES)
            .filter { it.name !in keep }
            .forEach { it.delete() }
    }
}

private fun detectExtension(b: ByteArray): String? = when {
    b.size < 12 -> null
    b[0] == 0xFF.toByte() && b[1] == 0xD8.toByte() && b[2] == 0xFF.toByte() -> ".jpg"
    b[0] == 0x89.toByte() && b[1] == 'P'.code.toByte() && b[2] == 'N'.code.toByte() && b[3] == 'G'.code.toByte() -> ".png"
    String(b, 0, 4, Charsets.US_ASCII) == "RIFF" && String(b, 8, 4, Charsets.US_ASCII) == "WEBP" -> ".webp"
    else -> null
}
