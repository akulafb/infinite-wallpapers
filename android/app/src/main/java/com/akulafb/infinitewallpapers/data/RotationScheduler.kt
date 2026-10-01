// Schedules automatic wallpaper changes with WorkManager, so rotation keeps
// running when the app is closed and survives reboots. WorkManager handles
// catch-up after the phone was off, and only runs when the network is up.

package com.akulafb.infinitewallpapers.data

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.akulafb.infinitewallpapers.App
import kotlinx.coroutines.CancellationException
import java.io.IOException
import java.util.concurrent.TimeUnit

private const val WORK_NAME = "rotate-wallpaper"

class RotationScheduler(private val context: Context, private val store: SettingsStore) {
    private val workManager get() = WorkManager.getInstance(context)

    // Start a fresh full interval from now. Used for explicit user actions
    // (change now, frequency change, pause/resume).
    fun reschedule() = arm(ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE)

    // Startup path: keep an already-queued job and its timing.
    fun ensureScheduled() = arm(ExistingPeriodicWorkPolicy.KEEP)

    private fun arm(policy: ExistingPeriodicWorkPolicy) {
        val cfg = store.get()
        val interval = cfg.frequency.intervalMs
        if (cfg.paused || interval == null) {
            workManager.cancelUniqueWork(WORK_NAME)
            if (cfg.nextRunAt != null) store.update { it.copy(nextRunAt = null) }
            return
        }
        workManager.enqueueUniquePeriodicWork(WORK_NAME, policy, request(interval))
        // With KEEP and a known due time, the job from a previous launch still stands.
        if (policy != ExistingPeriodicWorkPolicy.KEEP || cfg.nextRunAt == null) {
            store.update { it.copy(nextRunAt = System.currentTimeMillis() + interval) }
        }
    }

    private fun request(intervalMs: Long) =
        PeriodicWorkRequestBuilder<RotateWorker>(intervalMs, TimeUnit.MILLISECONDS)
            .setInitialDelay(intervalMs, TimeUnit.MILLISECONDS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
}

class RotateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = (applicationContext as App).container
        val store = container.store
        val interval = store.get().frequency.intervalMs ?: return Result.success()
        val result = try {
            // Skip if the user picked a wallpaper within the last half interval.
            container.wallpapers.applyScheduled(minGapMs = interval / 2)
            Result.success()
        } catch (e: CancellationException) {
            throw e // cancelled by reschedule(); it already set nextRunAt
        } catch (e: Exception) {
            // Search swallows per-provider network errors, so a flaky connection
            // shows up as "no images" too. Both are worth a few retries.
            val retryable = e is IOException || e is NoImagesException
            Log.w("rotation", "Scheduled rotation failed (attempt $runAttemptCount)", e)
            if (retryable && runAttemptCount < 3) Result.retry() else Result.failure()
        }
        // A retry comes back within minutes, so only move the clock once this
        // period is really done. Re-check pause/manual inside the update so we
        // never fight a reschedule() that ran meanwhile.
        if (result !is Result.Retry) {
            store.update {
                val next = it.frequency.intervalMs
                it.copy(nextRunAt = if (it.paused || next == null) null else System.currentTimeMillis() + next)
            }
        }
        return result
    }
}
