// Curated preset themes shown in the picker. Each carries a search query and a
// category hint the backend uses to tune sources. Icons are lucide components.
//
// PRESETS is the default grid shown on first load. ALL_PRESETS is a much larger
// pool (generic categories through ultra-specific ones) that the "Shuffle" button
// samples from to refresh the grid with new, unpredictable options.

import {
  Anchor,
  BookOpen,
  Brush,
  Building2,
  Camera,
  Car,
  Church,
  Cog,
  Compass,
  Droplets,
  Flag,
  Flame,
  Flower2,
  Gamepad2,
  Gem,
  Joystick,
  Landmark,
  Leaf,
  Moon,
  Mountain,
  Orbit,
  Palette,
  Palmtree,
  PawPrint,
  Rocket,
  Shapes,
  ShieldAlert,
  Sparkles,
  Sunrise,
  Swords,
  Waves,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ThemeCategory } from "../lib/wallpaper-types";

export interface Preset {
  id: string;
  label: string;
  query: string;
  category: ThemeCategory;
  Icon: LucideIcon;
}

// The default grid shown before any shuffle.
export const PRESETS: Preset[] = [
  { id: "nature", label: "Nature & Landscapes", query: "breathtaking nature landscape scenery", category: "landscape", Icon: Mountain },
  { id: "space", label: "Space & Galaxies", query: "deep space galaxy nebula stars", category: "general", Icon: Orbit },
  { id: "starwars", label: "Star Wars", query: "Star Wars cinematic", category: "web", Icon: Rocket },
  { id: "gaming", label: "Gaming", query: "epic video game key art", category: "web", Icon: Gamepad2 },
  { id: "anime", label: "Anime", query: "anime scenery", category: "anime", Icon: Sparkles },
  { id: "abstract", label: "Minimal & Abstract", query: "minimal abstract gradient", category: "general", Icon: Shapes },
  { id: "cyberpunk", label: "Cyberpunk & Neon", query: "cyberpunk neon city night", category: "web", Icon: Zap },
  { id: "cars", label: "Cars & Automotive", query: "supercar automotive photography", category: "web", Icon: Car },
  { id: "city", label: "Cityscapes", query: "city skyline at night", category: "general", Icon: Building2 },
  { id: "wildlife", label: "Animals & Wildlife", query: "wildlife animals in nature", category: "general", Icon: PawPrint },
  { id: "fantasy", label: "Fantasy Art", query: "epic fantasy landscape digital art", category: "web", Icon: Swords },
  { id: "ocean", label: "Mountains & Oceans", query: "mountains and ocean seascape", category: "landscape", Icon: Waves },
];

// Extra pool the shuffle button draws from — a mix of generic categories and
// very specific ones (art movements, franchises, eras) for unpredictable variety.
const SHUFFLE_POOL: Preset[] = [
  { id: "renaissance", label: "Italian Renaissance Paintings", query: "Italian Renaissance painting masterpiece", category: "general", Icon: Landmark },
  { id: "monet", label: "Monet's Last Works", query: "Claude Monet late impressionist water lilies painting", category: "general", Icon: Palette },
  { id: "vangogh", label: "Van Gogh Paintings", query: "Vincent van Gogh painting", category: "general", Icon: Brush },
  { id: "ukiyoe", label: "Japanese Ukiyo-e Art", query: "ukiyo-e Japanese woodblock print art", category: "general", Icon: Landmark },
  { id: "baroque", label: "Baroque Art", query: "Baroque era oil painting", category: "general", Icon: Palette },
  { id: "greekmyth", label: "Greek Mythology Art", query: "Greek mythology classical painting", category: "general", Icon: Landmark },
  { id: "gothic", label: "Gothic Cathedrals", query: "gothic cathedral architecture interior", category: "general", Icon: Church },
  { id: "artdeco", label: "Art Deco Design", query: "art deco architecture design poster", category: "general", Icon: Gem },
  { id: "surrealism", label: "Surrealist Art", query: "surrealist dreamlike painting", category: "general", Icon: Moon },
  { id: "watercolor", label: "Watercolor Illustrations", query: "soft watercolor illustration art", category: "general", Icon: Brush },
  { id: "naruto", label: "Naruto Anime", query: "Naruto anime scenery", category: "anime", Icon: Flame },
  { id: "onepiece", label: "One Piece", query: "One Piece anime", category: "anime", Icon: Anchor },
  { id: "aot", label: "Attack on Titan", query: "Attack on Titan anime", category: "anime", Icon: ShieldAlert },
  { id: "ghibli", label: "Studio Ghibli", query: "Studio Ghibli anime scenery", category: "anime", Icon: Wand2 },
  { id: "batman90s", label: "90s Batman Comics", query: "1990s Batman comic book art", category: "web", Icon: Moon },
  { id: "dccomics", label: "Classic DC Comics", query: "vintage DC Comics cover art", category: "web", Icon: BookOpen },
  { id: "marvelretro", label: "Retro Marvel Comics", query: "vintage Marvel comic book cover art", category: "web", Icon: BookOpen },
  { id: "retroarcade", label: "Retro Arcade & Pixel Art", query: "retro arcade pixel art video game", category: "web", Icon: Joystick },
  { id: "synthwave", label: "80s Synthwave", query: "80s synthwave retro futuristic neon", category: "web", Icon: Zap },
  { id: "steampunk", label: "Steampunk", query: "steampunk gears brass machinery art", category: "web", Icon: Cog },
  { id: "samurai", label: "Samurai & Feudal Japan", query: "samurai feudal Japan historical art", category: "general", Icon: Swords },
  { id: "wildwest", label: "Wild West", query: "wild west desert cowboy scenery", category: "general", Icon: Compass },
  { id: "f1racing", label: "F1 & Motorsport", query: "Formula 1 racing motorsport", category: "web", Icon: Flag },
  { id: "darkacademia", label: "Dark Academia", query: "dark academia aesthetic library books moody", category: "general", Icon: BookOpen },
  { id: "cottagecore", label: "Cottagecore", query: "cottagecore aesthetic cozy cottage nature", category: "landscape", Icon: Flower2 },
  { id: "y2k", label: "Y2K Aesthetic", query: "Y2K aesthetic futuristic 2000s", category: "web", Icon: Sparkles },
  { id: "travelposters", label: "Vintage Travel Posters", query: "vintage travel poster illustration", category: "general", Icon: Compass },
  { id: "streetphoto", label: "Street Photography", query: "urban street photography black and white", category: "general", Icon: Camera },
  { id: "brutalism", label: "Brutalist Architecture", query: "brutalist architecture concrete building", category: "general", Icon: Building2 },
  { id: "desert", label: "Deserts & Dunes", query: "sahara desert sand dunes landscape", category: "landscape", Icon: Sunrise },
  { id: "aurora", label: "Aurora & Night Sky", query: "aurora borealis night sky", category: "landscape", Icon: Moon },
  { id: "tropical", label: "Tropical Beaches", query: "tropical beach paradise turquoise water", category: "landscape", Icon: Palmtree },
  { id: "autumn", label: "Autumn Forests", query: "autumn forest golden foliage", category: "landscape", Icon: Leaf },
  { id: "rainforest", label: "Rainforests & Jungle", query: "lush rainforest jungle canopy", category: "landscape", Icon: Leaf },
  { id: "underwater", label: "Underwater & Coral Reefs", query: "underwater coral reef marine life", category: "landscape", Icon: Waves },
  { id: "waterfalls", label: "Waterfalls", query: "majestic waterfall nature", category: "landscape", Icon: Droplets },
  { id: "botanical", label: "Botanical & Flowers", query: "macro flower botanical photography", category: "general", Icon: Flower2 },
];

// Every preset the shuffle can surface, including the original defaults.
const ALL_PRESETS: Preset[] = [...PRESETS, ...SHUFFLE_POOL];

// Returns `count` random, unique presets — biased away from `exclude` (the
// currently visible set) so a shuffle reliably feels like a fresh set.
export function shuffleThemes(count: number, exclude: readonly string[] = []): Preset[] {
  const fresh = ALL_PRESETS.filter((preset) => !exclude.includes(preset.id));
  const pool = fresh.length >= count ? fresh : ALL_PRESETS;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
