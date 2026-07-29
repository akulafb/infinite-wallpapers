// Curated preset themes shown in the picker. Each carries a search query and a
// category hint the backend uses to tune sources. Icons are lucide components.

import {
  Building2,
  Car,
  Gamepad2,
  Mountain,
  Orbit,
  PawPrint,
  Rocket,
  Shapes,
  Sparkles,
  Swords,
  Waves,
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
