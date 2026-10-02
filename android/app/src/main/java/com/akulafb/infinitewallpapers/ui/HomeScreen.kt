package com.akulafb.infinitewallpapers.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.akulafb.infinitewallpapers.data.AppConfig
import com.akulafb.infinitewallpapers.data.Frequency
import com.akulafb.infinitewallpapers.data.Preset
import com.akulafb.infinitewallpapers.data.WallpaperTarget
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

private fun statusText(cfg: AppConfig, now: Long): String = when {
    cfg.paused -> "Rotation paused"
    cfg.frequency == Frequency.MANUAL -> "Manual mode"
    cfg.nextRunAt != null -> "Next change in about ${formatRemaining(cfg.nextRunAt - now)}"
    else -> "Changes ${cfg.frequency.label.lowercase()}"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(vm: MainViewModel, onOpenSettings: () -> Unit) {
    val config by vm.config.collectAsStateWithLifecycle()
    val hasKey by vm.hasSerperKey.collectAsStateWithLifecycle()
    val grid by vm.grid.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var description by rememberSaveable { mutableStateOf("") }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(30_000)
        }
    }
    LaunchedEffect(Unit) { vm.errors.collect { snackbar.showSnackbar(it) } }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(config.theme.label, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            statusText(config, now),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    if (config.frequency != Frequency.MANUAL) {
                        TextButton(onClick = vm::togglePause) { Text(if (config.paused) "Resume" else "Pause") }
                    }
                    IconButton(onClick = onOpenSettings) { Icon(Icons.Filled.Settings, "Settings") }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            item { CurrentWallpaper(config, vm.wallpapersDir, busy, vm::skip, vm::next) }

            if (!hasKey) {
                item {
                    OutlinedCard(Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Add a Serper API key to search the whole web. Without it, wallpapers come from Wallhaven.",
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f),
                            )
                            TextButton(onClick = onOpenSettings) { Text("Settings") }
                        }
                    }
                }
            }

            item {
                Section(
                    "Theme",
                    "Tap a theme to switch your wallpaper now.",
                    action = { TextButton(onClick = vm::shuffle) { Text("🔀 Shuffle") } },
                ) {
                    grid.chunked(2).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            row.forEach { preset ->
                                ThemeCard(
                                    preset = preset,
                                    vm = vm,
                                    selected = config.theme.id == preset.id,
                                    loading = busy == Busy.Theme(preset.id),
                                    enabled = busy == null,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }

            item {
                Section("Describe your own", "Type anything: a place, a mood, an art style, or a specific scene.") {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        placeholder = { Text("e.g. foggy pine forest at dawn") },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        enabled = busy == null && description.isNotBlank(),
                        onClick = { vm.applyCustom(description) { description = "" } },
                    ) {
                        if (busy == Busy.Custom) Spinner() else Text("✨ Find wallpaper")
                    }
                }
            }

            item {
                Section("Change every", "Android runs this in the background, even when the app is closed.") {
                    Segmented(Frequency.entries, config.frequency, { it.label }, vm::setFrequency)
                }
            }

            item {
                Section("Set on", null) {
                    Segmented(WallpaperTarget.entries, config.target, { it.label }, vm::setTarget)
                }
            }

            if (config.history.isNotEmpty()) {
                item {
                    Section("Recent", null) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(config.history, key = { it.id }) { record ->
                                Box(
                                    Modifier
                                        .width(72.dp)
                                        .aspectRatio(9f / 16f)
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable(enabled = busy == null) { vm.applyHistory(record) },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    AsyncImage(
                                        model = File(vm.wallpapersDir, record.file),
                                        contentDescription = record.themeLabel,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                    if (busy == Busy.History(record.id)) Spinner(Color.White)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CurrentWallpaper(
    config: AppConfig,
    dir: File,
    busy: Busy?,
    onSkip: () -> Unit,
    onNext: () -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        val current = config.current
        if (current == null) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("No wallpaper yet", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Pick a theme below or describe what you want. The app finds a real one on the web and sets it.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            return@Card
        }
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            AsyncImage(
                model = File(dir, current.file),
                contentDescription = current.themeLabel,
                contentScale = ContentScale.Crop,
                modifier = Modifier.width(130.dp).aspectRatio(9f / 19.5f).clip(RoundedCornerShape(14.dp)),
            )
            Column(Modifier.weight(1f).height(282.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(current.themeLabel, style = MaterialTheme.typography.titleMedium)
                    if (current.width > 0) {
                        Text(
                            "${current.width}×${current.height}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(enabled = busy == null, onClick = onNext, modifier = Modifier.fillMaxWidth()) {
                        if (busy == Busy.Next) Spinner() else {
                            Icon(Icons.Filled.Refresh, null, Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Change now")
                        }
                    }
                    FilledTonalButton(enabled = busy == null, onClick = onSkip, modifier = Modifier.fillMaxWidth()) {
                        if (busy == Busy.Skip) Spinner() else Text("Skip & block")
                    }
                }
            }
        }
    }
}

@Composable
private fun ThemeCard(
    preset: Preset,
    vm: MainViewModel,
    selected: Boolean,
    loading: Boolean,
    enabled: Boolean,
    modifier: Modifier,
) {
    var thumb by remember(preset.id) { mutableStateOf(vm.cachedThumbnail(preset)) }
    LaunchedEffect(preset.id) { if (thumb == null) thumb = vm.thumbnail(preset) }
    val shape = RoundedCornerShape(16.dp)

    Surface(
        onClick = { vm.selectPreset(preset) },
        enabled = enabled,
        shape = shape,
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = if (selected) BorderStroke(3.dp, MaterialTheme.colorScheme.primary) else null,
        modifier = modifier.aspectRatio(4f / 3f),
    ) {
        Box {
            if (thumb != null) {
                AsyncImage(
                    model = thumb,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            Box(
                Modifier.fillMaxSize().background(
                    Brush.verticalGradient(0.35f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.75f)),
                ),
            )
            Column(Modifier.align(Alignment.BottomStart).padding(10.dp)) {
                Text(preset.emoji, fontSize = 20.sp)
                Text(
                    preset.label,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (loading) {
                Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.4f)), contentAlignment = Alignment.Center) {
                    Spinner(Color.White)
                }
            }
        }
    }
}

@Composable
private fun Spinner(color: Color = MaterialTheme.colorScheme.onPrimary) {
    CircularProgressIndicator(Modifier.size(20.dp), color = color, strokeWidth = 2.dp)
}
