// Curated preset themes shown in the picker. Each carries a search query, a
// category hint for the search sources, and an emoji for the card.
// Ported from renderer/main/presets.ts.

package com.akulafb.infinitewallpapers.data

data class Preset(
    val id: String,
    val label: String,
    val query: String,
    val category: ThemeCategory,
    val emoji: String,
) {
    fun toTheme() = ThemeConfig(id = id, label = label, query = query, custom = false, category = category)
}

const val THEME_GRID_SIZE = 12

// The default grid shown before any shuffle.
val PRESETS = listOf(
    Preset("nature", "Nature & Landscapes", "breathtaking nature landscape scenery", ThemeCategory.LANDSCAPE, "🏔️"),
    Preset("space", "Space & Galaxies", "deep space galaxy nebula stars", ThemeCategory.GENERAL, "🌌"),
    Preset("scifi", "Sci-Fi & Spaceships", "science fiction spaceship", ThemeCategory.WEB, "🚀"),
    Preset("gaming", "Gaming", "epic video game key art", ThemeCategory.WEB, "🎮"),
    Preset("anime", "Anime", "anime scenery", ThemeCategory.ANIME, "✨"),
    Preset("abstract", "Minimal & Abstract", "minimal abstract gradient", ThemeCategory.GENERAL, "🔷"),
    Preset("cyberpunk", "Cyberpunk & Neon", "cyberpunk neon city night", ThemeCategory.WEB, "⚡"),
    Preset("cars", "Cars & Automotive", "supercar automotive photography", ThemeCategory.WEB, "🏎️"),
    Preset("city", "Cityscapes", "city skyline at night", ThemeCategory.GENERAL, "🏙️"),
    Preset("wildlife", "Animals & Wildlife", "wildlife animals in nature", ThemeCategory.GENERAL, "🐾"),
    Preset("fantasy", "Fantasy Art", "epic fantasy landscape digital art", ThemeCategory.WEB, "⚔️"),
    Preset("ocean", "Mountains & Oceans", "mountains and ocean seascape", ThemeCategory.LANDSCAPE, "🌊"),
)

// Extra pool the shuffle button draws from — generic categories plus very
// specific ones (art movements, genres, eras) for unpredictable variety.
private val SHUFFLE_POOL = listOf(
    Preset("renaissance", "Italian Renaissance Paintings", "Italian Renaissance painting masterpiece", ThemeCategory.GENERAL, "🏛️"),
    Preset("monet", "Monet's Last Works", "Claude Monet late impressionist water lilies painting", ThemeCategory.GENERAL, "🎨"),
    Preset("vangogh", "Van Gogh Paintings", "Vincent van Gogh painting", ThemeCategory.GENERAL, "🖌️"),
    Preset("ukiyoe", "Japanese Ukiyo-e Art", "ukiyo-e Japanese woodblock print art", ThemeCategory.GENERAL, "🏛️"),
    Preset("baroque", "Baroque Art", "Baroque era oil painting", ThemeCategory.GENERAL, "🎨"),
    Preset("greekmyth", "Greek Mythology Art", "Greek mythology classical painting", ThemeCategory.GENERAL, "🏛️"),
    Preset("gothic", "Gothic Cathedrals", "gothic cathedral architecture interior", ThemeCategory.GENERAL, "⛪"),
    Preset("artdeco", "Art Deco Design", "art deco architecture design poster", ThemeCategory.GENERAL, "💎"),
    Preset("surrealism", "Surrealist Art", "surrealist dreamlike painting", ThemeCategory.GENERAL, "🌙"),
    Preset("watercolor", "Watercolor Illustrations", "soft watercolor illustration art", ThemeCategory.GENERAL, "🖌️"),
    Preset("ninja", "Ninja Anime", "ninja", ThemeCategory.ANIME, "🔥"),
    Preset("pirates", "Pirate Adventures", "pirates", ThemeCategory.WEB, "⚓"),
    Preset("darkfantasy", "Dark Fantasy Anime", "dark fantasy", ThemeCategory.ANIME, "🛡️"),
    Preset("animevillage", "Cozy Anime Villages", "anime village", ThemeCategory.ANIME, "🪄"),
    Preset("noircomics", "Noir Comic Art", "noir comic art", ThemeCategory.WEB, "🌙"),
    Preset("comics", "Classic Comic Art", "comics", ThemeCategory.WEB, "📖"),
    Preset("superheroes", "Superhero Art", "superheroes", ThemeCategory.WEB, "💥"),
    Preset("retroarcade", "Retro Arcade & Pixel Art", "retro arcade pixel art video game", ThemeCategory.WEB, "🕹️"),
    Preset("synthwave", "80s Synthwave", "80s synthwave retro futuristic neon", ThemeCategory.WEB, "⚡"),
    Preset("steampunk", "Steampunk", "steampunk gears brass machinery art", ThemeCategory.WEB, "⚙️"),
    Preset("samurai", "Samurai & Feudal Japan", "samurai feudal Japan historical art", ThemeCategory.GENERAL, "⚔️"),
    Preset("wildwest", "Wild West", "wild west desert cowboy scenery", ThemeCategory.GENERAL, "🧭"),
    Preset("motorsport", "Racing & Motorsport", "motorsport", ThemeCategory.WEB, "🏁"),
    Preset("darkacademia", "Dark Academia", "dark academia aesthetic library books moody", ThemeCategory.GENERAL, "📖"),
    Preset("cottagecore", "Cottagecore", "cottagecore aesthetic cozy cottage nature", ThemeCategory.LANDSCAPE, "🌸"),
    Preset("y2k", "Y2K Aesthetic", "Y2K aesthetic futuristic 2000s", ThemeCategory.WEB, "✨"),
    Preset("travelposters", "Vintage Travel Posters", "vintage travel poster illustration", ThemeCategory.GENERAL, "🧭"),
    Preset("streetphoto", "Street Photography", "urban street photography black and white", ThemeCategory.GENERAL, "📷"),
    Preset("brutalism", "Brutalist Architecture", "brutalist architecture concrete building", ThemeCategory.GENERAL, "🏙️"),
    Preset("desert", "Deserts & Dunes", "sahara desert sand dunes landscape", ThemeCategory.LANDSCAPE, "🌅"),
    Preset("aurora", "Aurora & Night Sky", "aurora borealis night sky", ThemeCategory.LANDSCAPE, "🌙"),
    Preset("tropical", "Tropical Beaches", "tropical beach paradise turquoise water", ThemeCategory.LANDSCAPE, "🌴"),
    Preset("autumn", "Autumn Forests", "autumn forest golden foliage", ThemeCategory.LANDSCAPE, "🍂"),
    Preset("rainforest", "Rainforests & Jungle", "lush rainforest jungle canopy", ThemeCategory.LANDSCAPE, "🍂"),
    Preset("underwater", "Underwater & Coral Reefs", "underwater coral reef marine life", ThemeCategory.LANDSCAPE, "🌊"),
    Preset("waterfalls", "Waterfalls", "majestic waterfall nature", ThemeCategory.LANDSCAPE, "💧"),
    Preset("botanical", "Botanical & Flowers", "macro flower botanical photography", ThemeCategory.GENERAL, "🌸"),
)

private val ALL_PRESETS = PRESETS + SHUFFLE_POOL

// Returns `count` random presets, avoiding the currently visible set when possible.
fun shuffleThemes(count: Int, exclude: Collection<String>): List<Preset> {
    val fresh = ALL_PRESETS.filter { it.id !in exclude }
    return (if (fresh.size >= count) fresh else ALL_PRESETS).shuffled().take(count)
}

// Rebuilds the saved grid from ids. Unknown ids are dropped and the grid is
// backfilled (defaults first) so it always shows `count` tiles.
fun presetsFromIds(ids: List<String>, count: Int): List<Preset> {
    if (ids.isEmpty()) return PRESETS.take(count)
    val byId = ALL_PRESETS.associateBy { it.id }
    val restored = ids.distinct().mapNotNull { byId[it] }.take(count)
    return restored + ALL_PRESETS.filter { it !in restored }.take(count - restored.size)
}
