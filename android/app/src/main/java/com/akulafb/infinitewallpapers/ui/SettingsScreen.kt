package com.akulafb.infinitewallpapers.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.akulafb.infinitewallpapers.data.ThemeSource

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(vm: MainViewModel, onBack: () -> Unit) {
    val config by vm.config.collectAsStateWithLifecycle()
    val hasKey by vm.hasSerperKey.collectAsStateWithLifecycle()
    var key by remember { mutableStateOf("") }
    val uri = LocalUriHandler.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            Section("Serper API key", "Optional. Adds whole-web Google Images search. Without it, wallpapers come from Wallhaven.") {
                Text(
                    if (hasKey) "A key is saved." else "No key saved.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = key,
                    onValueChange = { key = it },
                    label = { Text(if (hasKey) "Replace key" else "Paste key") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(enabled = key.isNotBlank(), onClick = { vm.setSerperKey(key); key = "" }) { Text("Save") }
                    if (hasKey) OutlinedButton(onClick = { vm.setSerperKey("") }) { Text("Remove") }
                    TextButton(onClick = { runCatching { uri.openUri("https://serper.dev") } }) { Text("Get a free key") }
                }
            }

            Section("Appearance", null) {
                Segmented(ThemeSource.entries, config.themeSource, { it.label }, vm::setThemeSource)
            }

            Section("About", null) {
                Text(
                    "Images come from Wallhaven and, with a key, Google Images via Serper. " +
                        "Each image belongs to its creator. Safe search is always on.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
