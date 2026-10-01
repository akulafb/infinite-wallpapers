package com.akulafb.infinitewallpapers

import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.akulafb.infinitewallpapers.data.ThemeSource
import com.akulafb.infinitewallpapers.ui.HomeScreen
import com.akulafb.infinitewallpapers.ui.MainViewModel
import com.akulafb.infinitewallpapers.ui.SettingsScreen

class MainActivity : ComponentActivity() {
    private val vm: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val config by vm.config.collectAsStateWithLifecycle()
            val dark = when (config.themeSource) {
                ThemeSource.SYSTEM -> isSystemInDarkTheme()
                ThemeSource.LIGHT -> false
                ThemeSource.DARK -> true
            }
            AppTheme(dark) {
                var showSettings by rememberSaveable { mutableStateOf(false) }
                BackHandler(enabled = showSettings) { showSettings = false }
                if (showSettings) SettingsScreen(vm, onBack = { showSettings = false })
                else HomeScreen(vm, onOpenSettings = { showSettings = true })
            }
        }
    }
}

// Material You colours from the user's wallpaper on Android 12+, which suits a wallpaper app.
@Composable
private fun AppTheme(dark: Boolean, content: @Composable () -> Unit) {
    val context = LocalContext.current
    val colors = when {
        Build.VERSION.SDK_INT >= 31 -> if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        dark -> darkColorScheme()
        else -> lightColorScheme()
    }
    MaterialTheme(colorScheme = colors, content = content)
}
