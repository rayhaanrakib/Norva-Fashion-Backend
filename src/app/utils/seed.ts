import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import config from "../config";
import { prisma } from "../lib/prisma";

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

type SeedColor = { name: string; hex: string };

type SeedProduct = {
  name: string;
  slug: string;
  category: string;
  price: number;
  compareAt?: number;
  subtitle: string;
  description: string;
  story?: string;
  material: string;
  fit: string;
  care?: string;
  tags: string[];
  featured?: boolean;
  sizes: string[];
  colors: SeedColor[];
  images: string[];
  rating: number;
  ratingCount: number;
  soldCount?: number;
  stockBase: number;
};

const WOMEN = ["XS", "S", "M", "L", "XL"];
const MEN = ["S", "M", "L", "XL", "XXL"];
const ONE = ["One Size"];
const SHOES = ["36", "37", "38", "39", "40", "41", "42"];

const CATEGORIES = [
  {
    name: "Women",
    slug: "women",
    tagline: "Quietly confident everyday dressing",
    description:
      "Fluid tailoring, sculpted knits and considered layers — designed to be worn on repeat, season after season.",
    heroImage: img("photo-1483985988355-763728e1935b", 1600),
    position: 0,
  },
  {
    name: "Men",
    slug: "men",
    tagline: "Essentials with a sharper angle",
    description:
      "Relaxed structure and honest fabrics. Pieces that move easily between the studio and the street.",
    heroImage: img("photo-1490578474895-699cd4e2cf59", 1600),
    position: 1,
  },
  {
    name: "Accessories",
    slug: "accessories",
    tagline: "The finishing note",
    description: "Leather, metal and knit — small objects that change how everything else reads.",
    heroImage: img("photo-1523170335258-f5ed11844a49", 1600),
    position: 2,
  },
  {
    name: "Footwear",
    slug: "footwear",
    tagline: "Grounded, sculptural, comfortable",
    description: "Shoes built on real lasts, with soles made for long days and longer walks.",
    heroImage: img("photo-1543163521-1bf539c55dd2", 1600),
    position: 3,
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    tagline: "Home, scent, ritual",
    description: "Objects for the rooms you actually live in — ceramics, linen and quiet fragrance.",
    heroImage: img("photo-1522708323590-d24dbb6b0267", 1600),
    position: 4,
  },
  {
    name: "New In",
    slug: "new-in",
    tagline: "Just landed",
    description: "The newest additions to the NORVA wardrobe, straight from the studio.",
    heroImage: img("photo-1469334031218-e382a71b716b", 1600),
    position: 5,
  },
];

const PRODUCTS: SeedProduct[] = [
  {
    name: "Sculpted Rib Dress",
    slug: "sculpted-rib-dress",
    category: "women",
    price: 96,
    subtitle: "Second-skin rib knit, cut to move",
    description:
      "A body-skimming dress in organic cotton rib that holds its shape through the day. Mid-calf length, a clean crew neckline and just enough stretch to feel effortless.",
    story:
      "We spent four months on the rib tension alone. Too loose and it loses its line; too tight and it stops breathing. This is the version that does both.",
    material: "Organic cotton rib knit",
    fit: "Regular",
    care: "Machine wash cold, dry flat",
    tags: ["bestseller", "women"],
    featured: true,
    sizes: WOMEN,
    colors: [
      { name: "Chocolate", hex: "#5A4636" },
      { name: "Blush", hex: "#E7C6BF" },
      { name: "Black", hex: "#232323" },
    ],
    images: [img("photo-1539008835657-9e8e9680c956"), img("photo-1595777457583-95e059d581b8")],
    rating: 4.9,
    ratingCount: 486,
    stockBase: 26,
  },
  {
    name: "Everyday Trench Coat",
    slug: "everyday-trench-coat",
    category: "women",
    price: 190,
    compareAt: 220,
    subtitle: "Cotton gabardine, unlined for layering",
    description:
      "A modern trench with a relaxed shoulder, storm flap and a belt that cinches or hangs loose. Unlined so it layers over knitwear without bulk.",
    material: "Cotton gabardine",
    fit: "Regular",
    tags: ["sale", "bestseller"],
    featured: true,
    sizes: WOMEN,
    colors: [
      { name: "Beige", hex: "#D4C4A8" },
      { name: "Black", hex: "#232323" },
    ],
    images: [img("photo-1591047139829-d91aecb6caea"), img("photo-1592878849122-facb97520f9e")],
    rating: 4.9,
    ratingCount: 310,
    stockBase: 16,
  },
  {
    name: "Flowing Maxi Skirt",
    slug: "flowing-maxi-skirt",
    category: "women",
    price: 84,
    subtitle: "Bamboo viscose with a fluid drape",
    description:
      "Bias-cut panels give this skirt its movement. An elasticated back waist keeps it comfortable without losing the clean line at the front.",
    material: "Bamboo viscose",
    fit: "Relaxed",
    tags: ["new"],
    sizes: WOMEN,
    colors: [
      { name: "Dusty Rose", hex: "#C99A93" },
      { name: "Sage", hex: "#9CA88F" },
    ],
    images: [img("photo-1583496661160-fb5886a0aaaa"), img("photo-1551803091-e20673f15770")],
    rating: 4.6,
    ratingCount: 72,
    stockBase: 21,
  },
  {
    name: "Merino Roll-Neck",
    slug: "merino-roll-neck",
    category: "women",
    price: 124,
    subtitle: "Extra-fine merino, zero itch",
    description:
      "A roll-neck fine enough to wear under tailoring and warm enough to wear alone. Knitted in a single piece to remove side seams.",
    material: "Extra-fine merino wool",
    fit: "Regular",
    tags: ["limited", "eco"],
    sizes: WOMEN,
    colors: [
      { name: "Oat", hex: "#D8CBAF" },
      { name: "Forest", hex: "#2F4438" },
    ],
    images: [img("photo-1576566588028-4147f3842f27"), img("photo-1434389677669-e08b4cac3105")],
    rating: 4.8,
    ratingCount: 96,
    stockBase: 14,
  },
  {
    name: "Tailored Wide Trouser",
    slug: "tailored-wide-trouser",
    category: "women",
    price: 118,
    subtitle: "High-rise, pressed crease, deep pockets",
    description:
      "A wide-leg trouser with a flat front and a crease that stays. Cut long so it breaks properly over a heel or a chunky sole.",
    material: "Wool-cotton suiting",
    fit: "Relaxed",
    tags: ["new", "women"],
    featured: true,
    sizes: WOMEN,
    colors: [
      { name: "Ink", hex: "#2B2E3A" },
      { name: "Stone", hex: "#C8C1B4" },
    ],
    images: [img("photo-1594633312681-425c7b97ccd1"), img("photo-1509551388413-e18d0ac5d495")],
    rating: 4.7,
    ratingCount: 128,
    stockBase: 19,
  },
  {
    name: "Essential Crew Tee",
    slug: "essential-crew-tee",
    category: "men",
    price: 38,
    compareAt: 48,
    subtitle: "240gsm organic cotton",
    description:
      "The tee we kept re-ordering. Heavy enough to hold its neckline, soft enough to sleep in. Cut straight through the body with a slightly wider sleeve.",
    material: "100% organic cotton jersey",
    fit: "Regular",
    tags: ["bestseller", "sale"],
    featured: true,
    sizes: MEN,
    colors: [
      { name: "Ivory", hex: "#F2EDE6" },
      { name: "Charcoal", hex: "#3A362F" },
      { name: "Clay", hex: "#C2572F" },
    ],
    images: [img("photo-1521572163474-6864f9cf17ab"), img("photo-1503341504253-dff4815485f1")],
    rating: 4.8,
    ratingCount: 412,
    soldCount: 620,
    stockBase: 30,
  },
  {
    name: "Oxford Button-Down",
    slug: "oxford-button-down",
    category: "men",
    price: 78,
    subtitle: "Soft-washed organic oxford",
    description:
      "A button-down that behaves like a shirt and feels like a tee. Garment-washed for softness, with a collar that sits up on its own.",
    material: "Organic cotton oxford weave",
    fit: "Regular",
    tags: ["bestseller", "eco"],
    sizes: MEN,
    colors: [
      { name: "Chambray", hex: "#7C91A8" },
      { name: "White", hex: "#F4F1EC" },
    ],
    images: [img("photo-1596755094514-f87e34085b2c"), img("photo-1602810318383-e386cc2a3ccf")],
    rating: 4.9,
    ratingCount: 268,
    stockBase: 18,
  },
  {
    name: "Chino Pant",
    slug: "chino-pant",
    category: "men",
    price: 88,
    subtitle: "Cotton twill with a straight leg",
    description:
      "A chino with a touch of stretch and a genuinely useful pocket set. Sits at the natural waist, tapers just slightly below the knee.",
    material: "Cotton twill",
    fit: "Regular",
    tags: ["bestseller"],
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: [
      { name: "Khaki", hex: "#B6A27C" },
      { name: "Navy", hex: "#2C3550" },
      { name: "Black", hex: "#232323" },
    ],
    images: [img("photo-1473966968600-fa801b869a1a"), img("photo-1624378439575-d8705ad7ae80")],
    rating: 4.8,
    ratingCount: 340,
    stockBase: 26,
  },
  {
    name: "Merino Crew Knit",
    slug: "merino-crew-knit",
    category: "men",
    price: 128,
    compareAt: 150,
    subtitle: "Extra-fine merino, 12-gauge",
    description:
      "A crew-neck knit with a clean shoulder and ribbed cuffs that recover their shape. Light enough for indoors, warm enough for the walk home.",
    material: "100% extra-fine merino wool",
    fit: "Regular",
    tags: ["sale"],
    sizes: MEN,
    colors: [
      { name: "Wheat", hex: "#D9C59B" },
      { name: "Graphite", hex: "#4A4A4A" },
    ],
    images: [img("photo-1610652492500-ded49ceeb378"), img("photo-1576871337622-98d48d1cf531")],
    rating: 4.9,
    ratingCount: 150,
    stockBase: 14,
  },
  {
    name: "Relaxed Overshirt",
    slug: "relaxed-overshirt",
    category: "men",
    price: 138,
    subtitle: "Brushed cotton, double patch pocket",
    description:
      "Half shirt, half jacket. Brushed cotton on the outside, smooth against the skin, with pockets big enough for a notebook and a phone.",
    material: "Brushed cotton",
    fit: "Oversized",
    tags: ["new"],
    featured: true,
    sizes: MEN,
    colors: [
      { name: "Olive", hex: "#5B6249" },
      { name: "Sand", hex: "#CBB79A" },
    ],
    images: [img("photo-1591047139829-d91aecb6caea"), img("photo-1556821840-3a63f95609a7")],
    rating: 4.7,
    ratingCount: 88,
    stockBase: 17,
  },
  {
    name: "Sculpted Leather Tote",
    slug: "sculpted-leather-tote",
    category: "accessories",
    price: 210,
    subtitle: "Vegetable-tanned leather, unlined",
    description:
      "One piece of leather, folded rather than stitched where possible. Fits a 15-inch laptop, a water bottle and everything else you insist on carrying.",
    material: "Vegetable-tanned leather",
    fit: "One Size",
    tags: ["bestseller", "limited"],
    featured: true,
    sizes: ONE,
    colors: [
      { name: "Cognac", hex: "#8B5A2B" },
      { name: "Black", hex: "#1E1E1E" },
    ],
    images: [img("photo-1584917865442-de89df76afd3"), img("photo-1548036328-c9fa89d128fa")],
    rating: 4.9,
    ratingCount: 204,
    stockBase: 12,
  },
  {
    name: "Woven Leather Belt",
    slug: "woven-leather-belt",
    category: "accessories",
    price: 58,
    subtitle: "Hand-woven, solid brass buckle",
    description:
      "A belt with no fixed holes — the pin goes anywhere. Hand-woven in a small workshop and finished with a solid brass buckle.",
    material: "Woven leather, brass",
    fit: "One Size",
    tags: ["new"],
    sizes: ONE,
    colors: [
      { name: "Tan", hex: "#B07B4F" },
      { name: "Black", hex: "#1E1E1E" },
    ],
    images: [img("photo-1553062407-98eeb64c6a62"), img("photo-1624222247344-550fb60583dc")],
    rating: 4.6,
    ratingCount: 64,
    stockBase: 34,
  },
  {
    name: "Merino Beanie",
    slug: "merino-beanie",
    category: "accessories",
    price: 32,
    subtitle: "Ribbed, double-layer crown",
    description: "A proper winter beanie: double-layer crown, ribbed brim that holds, no pom.",
    material: "Merino wool",
    fit: "One Size",
    tags: ["new"],
    sizes: ONE,
    colors: [
      { name: "Wheat", hex: "#D9C59B" },
      { name: "Charcoal", hex: "#3A362F" },
    ],
    images: [img("photo-1576871337622-98d48d1cf531"), img("photo-1510598969022-c4c6c5d05769")],
    rating: 4.6,
    ratingCount: 67,
    stockBase: 44,
  },
  {
    name: "Minimal Leather Sneaker",
    slug: "minimal-leather-sneaker",
    category: "footwear",
    price: 148,
    subtitle: "Full-grain leather, cupsole",
    description:
      "A stripped-back sneaker with a stitched cupsole and a leather lining that softens with wear. No logos, no noise.",
    material: "Full-grain leather, rubber sole",
    fit: "True to size",
    tags: ["bestseller", "eco"],
    featured: true,
    sizes: SHOES,
    colors: [
      { name: "White", hex: "#F4F1EC" },
      { name: "Black", hex: "#1E1E1E" },
    ],
    images: [img("photo-1560769629-975ec94e6a86"), img("photo-1549298916-b41d501d3772")],
    rating: 4.8,
    ratingCount: 312,
    stockBase: 22,
  },
  {
    name: "Studio Chelsea Boot",
    slug: "studio-chelsea-boot",
    category: "footwear",
    price: 185,
    compareAt: 210,
    subtitle: "Suede, elastic gusset, stacked heel",
    description:
      "A Chelsea boot with a slightly squared toe and a stacked heel that gives you presence without a wobble.",
    material: "Suede, leather lining",
    fit: "True to size",
    tags: ["sale"],
    sizes: SHOES,
    colors: [
      { name: "Tobacco", hex: "#7B5233" },
      { name: "Black", hex: "#1E1E1E" },
    ],
    images: [img("photo-1608256246200-53e635b5b65f"), img("photo-1520639888713-7851133b1ed0")],
    rating: 4.7,
    ratingCount: 118,
    stockBase: 15,
  },
  {
    name: "Canvas Weekender",
    slug: "canvas-weekender",
    category: "lifestyle",
    price: 132,
    subtitle: "Waxed canvas, leather trims",
    description:
      "Two nights, one bag. Waxed canvas that sheds rain, leather handles that age, and a base that stands up on its own.",
    material: "Waxed cotton canvas, leather",
    fit: "One Size",
    tags: ["new", "bestseller"],
    sizes: ONE,
    colors: [
      { name: "Field Green", hex: "#4A5340" },
      { name: "Black", hex: "#1E1E1E" },
    ],
    images: [img("photo-1553062407-98eeb64c6a62"), img("photo-1547949003-9792a18a2601")],
    rating: 4.8,
    ratingCount: 96,
    stockBase: 20,
  },
  {
    name: "Stoneware Mug Set",
    slug: "stoneware-mug-set",
    category: "lifestyle",
    price: 46,
    subtitle: "Set of two, reactive glaze",
    description:
      "Two mugs thrown in stoneware with a reactive glaze — no two are identical. Thick walls hold heat for the second cup.",
    material: "Stoneware ceramic",
    fit: "One Size",
    tags: ["eco"],
    sizes: ONE,
    colors: [
      { name: "Oat", hex: "#D8CBAF" },
      { name: "Ash", hex: "#9A9A94" },
    ],
    images: [img("photo-1514228742587-6b1558fcca3d"), img("photo-1495474472287-4d71bcdd2085")],
    rating: 4.7,
    ratingCount: 141,
    stockBase: 38,
  },
  {
    name: "Washed Linen Set",
    slug: "washed-linen-set",
    category: "lifestyle",
    price: 158,
    subtitle: "Duvet cover + two pillowcases",
    description:
      "Stonewashed European flax that gets softer every wash. Breathable in summer, layered-warm in winter.",
    material: "100% European flax linen",
    fit: "One Size",
    tags: ["new", "eco"],
    sizes: ONE,
    colors: [
      { name: "Chalk", hex: "#EDE9E2" },
      { name: "Slate", hex: "#6B7078" },
    ],
    images: [img("photo-1522771739844-6a9f6d5f14af"), img("photo-1522708323590-d24dbb6b0267")],
    rating: 4.9,
    ratingCount: 88,
    stockBase: 18,
  },
  {
    name: "Cedar & Smoke Candle",
    slug: "cedar-and-smoke-candle",
    category: "lifestyle",
    price: 42,
    subtitle: "Coconut wax, 60-hour burn",
    description:
      "Cedar, black pepper and a whisper of smoke. Poured into a reusable stoneware vessel with a 60-hour burn time.",
    material: "Coconut wax, cotton wick",
    fit: "One Size",
    tags: ["new"],
    sizes: ONE,
    colors: [{ name: "Terracotta", hex: "#B4552D" }],
    images: [img("photo-1602874801006-e26c8b0d5cc1"), img("photo-1603006905003-be475563bc59")],
    rating: 4.8,
    ratingCount: 173,
    stockBase: 60,
  },
  {
    name: "Silk Scarf",
    slug: "silk-scarf",
    category: "accessories",
    price: 68,
    subtitle: "Hand-rolled hem, 90cm square",
    description:
      "A 90cm square of mulberry silk with a hand-rolled hem. Wear it at the neck, in the hair, or on a bag strap.",
    material: "Mulberry silk",
    fit: "One Size",
    tags: ["limited"],
    sizes: ONE,
    colors: [
      { name: "Rust", hex: "#A9542F" },
      { name: "Sage", hex: "#9CA88F" },
    ],
    images: [img("photo-1601924994987-69e26d50dc26"), img("photo-1523170335258-f5ed11844a49")],
    rating: 4.7,
    ratingCount: 52,
    stockBase: 24,
  },
  {
    name: "Cashmere Wrap Cardigan",
    slug: "cashmere-wrap-cardigan",
    category: "women",
    price: 245,
    subtitle: "Grade-A cashmere, belted",
    description:
      "A wrap cardigan in grade-A cashmere, generous enough to layer over everything. Includes a self-tie belt that also works as a scarf.",
    material: "100% grade-A cashmere",
    fit: "Oversized",
    tags: ["limited", "bestseller"],
    featured: true,
    sizes: WOMEN,
    colors: [
      { name: "Oat", hex: "#D8CBAF" },
      { name: "Deep Plum", hex: "#4B2C3A" },
    ],
    images: [img("photo-1605763240000-7e93b172d754"), img("photo-1485462537746-965f33f7f6a7")],
    rating: 4.9,
    ratingCount: 67,
    stockBase: 9,
  },
  {
    name: "Field Jacket",
    slug: "field-jacket",
    category: "men",
    price: 210,
    subtitle: "Dry-wax cotton, four pockets",
    description:
      "A field jacket in dry-wax cotton that starts stiff and ends up yours. Four pockets, one internal, and a corduroy collar.",
    material: "Dry-wax cotton",
    fit: "Regular",
    tags: ["new"],
    sizes: MEN,
    colors: [
      { name: "Loden", hex: "#4C5343" },
      { name: "Umber", hex: "#6A4A33" },
    ],
    images: [img("photo-1551028719-00167b16eac5"), img("photo-1556821840-3a63f95609a7")],
    rating: 4.8,
    ratingCount: 74,
    stockBase: 13,
  },
  {
    name: "Straight Denim",
    slug: "straight-denim",
    category: "men",
    price: 104,
    subtitle: "Japanese selvedge, 13oz",
    description:
      "A true straight leg in 13oz Japanese selvedge. Rigid at first, then entirely yours after a few months.",
    material: "Japanese selvedge denim",
    fit: "Straight",
    tags: ["bestseller", "eco"],
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: [
      { name: "Indigo", hex: "#33445F" },
      { name: "Washed Black", hex: "#2A2A2A" },
    ],
    images: [img("photo-1542272604-787c3835535d"), img("photo-1541099649105-f69ad21f3246")],
    rating: 4.7,
    ratingCount: 196,
    stockBase: 25,
  },
  {
    name: "Ribbed Knit Midi",
    slug: "ribbed-knit-midi",
    category: "new-in",
    price: 112,
    subtitle: "Textured knit, side split",
    description:
      "A midi skirt in a textured rib with a single side split. Pairs with the merino roll-neck without competing.",
    material: "Cotton-merino blend",
    fit: "Regular",
    tags: ["new"],
    sizes: WOMEN,
    colors: [
      { name: "Cream", hex: "#EFE7DA" },
      { name: "Espresso", hex: "#3C2F27" },
    ],
    images: [img("photo-1583496661160-fb5886a0aaaa"), img("photo-1490481651871-ab68de25d43d")],
    rating: 4.6,
    ratingCount: 38,
    stockBase: 20,
  },
  {
    name: "Linen Camp Shirt",
    slug: "linen-camp-shirt",
    category: "new-in",
    price: 72,
    subtitle: "Washed linen, camp collar",
    description:
      "A camp-collar shirt in washed linen with just enough weight to hang properly. Wear it open over a tee or buttoned to the top.",
    material: "Washed linen",
    fit: "Relaxed",
    tags: ["new"],
    sizes: MEN,
    colors: [
      { name: "Ecru", hex: "#EDE4D3" },
      { name: "Faded Blue", hex: "#8FA6B8" },
    ],
    images: [img("photo-1596755094514-f87e34085b2c"), img("photo-1598033129183-c4f50c736f10")],
    rating: 4.7,
    ratingCount: 41,
    stockBase: 23,
  },
];

const JOURNAL = [
  {
    title: "How to build a wardrobe that actually works",
    slug: "build-a-wardrobe-that-works",
    excerpt:
      "Fewer, better pieces — and the geometry that makes them interchangeable. A framework for getting dressed in ninety seconds.",
    category: "Style",
    readTime: 6,
    coverImage: img("photo-1490481651871-ab68de25d43d", 1600),
    body: "At NORVA we design for a shared visual language: a restrained palette, honest materials, and silhouettes that echo each other. When every piece speaks the same language, getting dressed becomes almost automatic.\n\nStart with three neutrals and two accents. Then buy texture, not pattern — rib knits, brushed cotton, washed linen. Texture layers with itself; pattern competes.",
  },
  {
    title: "The quiet case for organic cotton",
    slug: "quiet-case-for-organic-cotton",
    excerpt:
      "Why material decisions are design decisions — and what changes when you choose the honest fibre.",
    category: "Materials",
    readTime: 5,
    coverImage: img("photo-1523381210434-271e8be1f52b", 1600),
    body: "Every NORVA garment begins with a material decision. We choose organic cotton for basics, recycled polyester for shells and vegetable-tanned leather for accessories — not because it is fashionable, but because it is the honest choice.\n\nOrganic cotton uses less water and no synthetic pesticides, and it feels better against the skin. That is the whole argument.",
  },
  {
    title: "Transitional layering, the NORVA way",
    slug: "transitional-layering",
    excerpt: "Three pieces, four outfits, one week of unpredictable weather.",
    category: "Journal",
    readTime: 4,
    coverImage: img("photo-1485462537746-965f33f7f6a7", 1600),
    body: "Layering is a ratio problem. A fine base layer plus a structured mid layer plus one relaxed outer layer covers almost every forecast.\n\nOur go-to: merino roll-neck, oversized overshirt, unlined trench. Swap the trouser and you have four outfits from three pieces.",
  },
];

const DISCOUNTS = [
  {
    code: "NORVA10",
    description: "10% off your first order",
    type: "PERCENT" as const,
    value: 10,
    minOrder: 0,
    maxUses: 10000,
  },
  {
    code: "STYLE20",
    description: "20% off orders over $150",
    type: "PERCENT" as const,
    value: 20,
    minOrder: 150,
    maxUses: 5000,
  },
  {
    code: "FREESHIP",
    description: "Free standard shipping, any order",
    type: "FREE_SHIPPING" as const,
    value: 0,
    minOrder: 0,
    maxUses: null,
  },
  {
    code: "NORVA25",
    description: "$25 off orders over $120",
    type: "FIXED" as const,
    value: 25,
    minOrder: 120,
    maxUses: 2000,
  },
];

const slugFor = (name: string, size: string, color: string, index: number) =>
  `NV-${name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase()}-${size.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}-${color
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 5)
    .toUpperCase()}-${index}`;

export async function runSeed({ silent = false }: { silent?: boolean } = {}) {
  const log = (...args: unknown[]) => (silent ? undefined : console.log(...args));

  // ----------------------------------------------------------
  // Accounts
  // ----------------------------------------------------------
  const passwordHash = await bcrypt.hash(config.seed.admin.password, config.bcryptSaltRounds);
  const staffHash = await bcrypt.hash(config.seed.staff.password, config.bcryptSaltRounds);
  const customerHash = await bcrypt.hash(config.seed.customer.password, config.bcryptSaltRounds);

  const admin = await prisma.user.upsert({
    where: { email: config.seed.admin.email },
    update: { role: "ADMIN" },
    create: {
      name: config.seed.admin.name,
      email: config.seed.admin.email,
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      phone: "+1 555 0100",
    },
  });

  await prisma.user.upsert({
    where: { email: config.seed.staff.email },
    update: {},
    create: {
      name: config.seed.staff.name,
      email: config.seed.staff.email,
      passwordHash: staffHash,
      role: "MANAGER",
      emailVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: config.seed.customer.email },
    update: {},
    create: {
      name: config.seed.customer.name,
      email: config.seed.customer.email,
      passwordHash: customerHash,
      role: "CUSTOMER",
      emailVerified: true,
      phone: "+880 1700 000000",
      storeCredit: 24,
      marketingOptIn: true,
      addresses: {
        create: {
          fullName: config.seed.customer.name,
          phone: "+880 1700 000000",
          line1: "House 14, Road 7, Gulshan 1",
          city: "Dhaka",
          postcode: "1212",
          country: "BD",
          isDefault: true,
        },
      },
    },
  });

  // ----------------------------------------------------------
  // Categories
  // ----------------------------------------------------------
  const categoryMap = new Map<string, string>();
  for (const category of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { tagline: category.tagline, description: category.description, heroImage: category.heroImage },
      create: category,
    });
    categoryMap.set(category.slug, record.id);
  }
  log(`✓ ${CATEGORIES.length} categories`);

  // ----------------------------------------------------------
  // Products
  // ----------------------------------------------------------
  let created = 0;
  for (const seed of PRODUCTS) {
    const categoryId = categoryMap.get(seed.category);
    if (!categoryId) continue;

    const existing = await prisma.product.findUnique({ where: { slug: seed.slug } });
    if (existing) continue;

    await prisma.product.create({
      data: {
        name: seed.name,
        slug: seed.slug,
        subtitle: seed.subtitle,
        description: seed.description,
        story: seed.story ?? "",
        material: seed.material,
        fit: seed.fit,
        care: seed.care ?? "Wash cold with similar colours. Dry naturally.",
        brand: "NORVA",
        status: "ACTIVE",
        featured: seed.featured ?? false,
        price: seed.price,
        compareAt: seed.compareAt ?? null,
        currency: "USD",
        tags: seed.tags,
        sizes: seed.sizes,
        colors: seed.colors,
        categoryId,
        rating: seed.rating,
        ratingCount: seed.ratingCount,
        soldCount: seed.soldCount ?? Math.floor(seed.ratingCount / 4),
        seoTitle: `${seed.name} — NORVA`,
        seoDescription: seed.subtitle,
        publishedAt: new Date(),
        images: {
          create: seed.images.map((url, index) => ({
            url,
            alt: `${seed.name} — view ${index + 1}`,
            position: index,
          })),
        },
        variants: {
          create: seed.sizes.flatMap((size) =>
            seed.colors.map((color, colorIndex) => ({
              sku: slugFor(seed.name, size, color.name, colorIndex),
              size,
              color: color.name,
              colorHex: color.hex,
              price: null,
              compareAt: seed.compareAt ?? null,
              stock:
                // A realistic smattering of low/empty stock so the UI states are visible.
                (seed.stockBase + size.length + colorIndex * 3) % 9 === 0
                  ? 0
                  : ((seed.stockBase + size.length + colorIndex * 3) % 6) + 1,
              lowStockThreshold: 3,
            })),
          ),
        },
      },
    });
    created += 1;
  }
  log(`✓ ${created} products (${PRODUCTS.length - created} already present)`);

  // ----------------------------------------------------------
  // Discounts
  // ----------------------------------------------------------
  for (const discount of DISCOUNTS) {
    await prisma.discount.upsert({
      where: { code: discount.code },
      update: {},
      create: {
        ...discount,
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 90 * 86_400_000),
        createdById: admin.id,
      },
    });
  }
  log(`✓ ${DISCOUNTS.length} discount codes`);

  // ----------------------------------------------------------
  // Journal
  // ----------------------------------------------------------
  for (const post of JOURNAL) {
    await prisma.journalPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        ...post,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - Math.random() * 30 * 86_400_000),
        authorId: admin.id,
      },
    });
  }
  log(`✓ ${JOURNAL.length} journal stories`);

  // ----------------------------------------------------------
  // Demo orders, reviews, subscribers
  // ----------------------------------------------------------
  const orderCount = await prisma.order.count();
  if (orderCount === 0) {
    const variants = await prisma.productVariant.findMany({
      where: { stock: { gt: 0 } },
      include: { product: true },
      take: 60,
    });

    const statuses = ["DELIVERED", "DELIVERED", "SHIPPED", "PROCESSING", "CONFIRMED"] as const;
    const address = {
      fullName: customer.name,
      phone: "+880 1700 000000",
      line1: "House 14, Road 7, Gulshan 1",
      city: "Dhaka",
      postcode: "1212",
      country: "BD",
    };

    for (let i = 0; i < 24; i += 1) {
      const picked = variants.slice((i * 3) % Math.max(1, variants.length - 3), ((i * 3) % 60) + 2).slice(0, 2);
      if (picked.length === 0) continue;

      const lines = picked.map((variant) => ({
        variant,
        quantity: ((i + 1) % 2) + 1,
      }));

      const subtotal = lines.reduce(
        (sum, line) =>
          sum + Number(line.variant.price ?? line.variant.product.price) * line.quantity,
        0,
      );
      const shippingTotal = subtotal >= config.commerce.freeShippingThreshold ? 0 : config.commerce.shippingFee;
      const taxTotal = Math.round(subtotal * config.commerce.taxRate * 100) / 100;
      const grandTotal = Math.round((subtotal + shippingTotal + taxTotal) * 100) / 100;
      const status = statuses[i % statuses.length];
      const placedAt = new Date(Date.now() - ((i * 1.4 + 1) * 86_400_000) / 2);

      await prisma.order.create({
        data: {
          number: `NV-DEMO-${1000 + i}`,
          userId: i % 4 === 0 ? null : customer.id,
          email: i % 4 === 0 ? `guest${i}@example.com` : customer.email,
          phone: address.phone,
          status,
          paymentStatus: status === "DELIVERED" ? "PAID" : "PENDING",
          subtotal,
          discountTotal: 0,
          shippingTotal,
          taxTotal,
          grandTotal,
          currency: "USD",
          shippingAddress: address,
          billingAddress: address,
          placedAt,
          confirmedAt: placedAt,
          shippedAt: status === "SHIPPED" || status === "DELIVERED" ? placedAt : null,
          deliveredAt: status === "DELIVERED" ? placedAt : null,
          items: {
            create: lines.map((line) => ({
              productId: line.variant.productId,
              variantId: line.variant.id,
              name: line.variant.product.name,
              slug: line.variant.product.slug,
              image: "",
              sku: line.variant.sku,
              size: line.variant.size,
              color: line.variant.color,
              unitPrice: Number(line.variant.price ?? line.variant.product.price),
              quantity: line.quantity,
              lineTotal:
                Math.round(
                  Number(line.variant.price ?? line.variant.product.price) * line.quantity * 100,
                ) / 100,
            })),
          },
          events: {
            create: [
              { status: "PENDING", note: "Order placed", createdAt: placedAt },
              { status, note: `Marked ${String(status).toLowerCase()} by demo seed`, createdAt: placedAt },
            ],
          },
          payment: {
            create: {
              provider: "SANDBOX",
              status: status === "DELIVERED" ? "PAID" : "PENDING",
              amount: grandTotal,
              currency: "USD",
              paidAt: status === "DELIVERED" ? placedAt : null,
            },
          },
        },
      });
    }
    log("✓ 24 demo orders");
  }

  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    const products = await prisma.product.findMany({ take: 12 });
    const samples = [
      { name: "Amelia H.", rating: 5, title: "My new uniform", body: "Fits perfectly, washes beautifully and the colour is exactly as photographed. I've already ordered a second." },
      { name: "Marcus L.", rating: 5, title: "Genuinely good quality", body: "The knit is properly soft and holds its shape after three washes. Worth the price." },
      { name: "Sofia M.", rating: 4, title: "Beautiful, runs slightly large", body: "Stunning fabric and a lovely drape. I sized down and it's now perfect." },
      { name: "Nadia K.", rating: 5, title: "Stopped twice to ask", body: "Comfortable enough for a full day of travel and smart enough for a meeting on arrival." },
      { name: "Jules P.", rating: 4, title: "Great everyday piece", body: "Exactly what I wanted for layering. Packaging was lovely too." },
    ];

    for (const [index, product] of products.entries()) {
      const sample = samples[index % samples.length];
      await prisma.review.create({
        data: {
          productId: product.id,
          customerName: sample.name,
          email: `reviewer${index}@example.com`,
          rating: sample.rating,
          title: sample.title,
          body: sample.body,
          status: "APPROVED",
          verifiedPurchase: true,
          helpfulCount: (index * 3) % 17,
          createdAt: new Date(Date.now() - index * 86_400_000),
        },
      });
    }
    log(`✓ ${products.length} approved reviews`);
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email: config.seed.customer.email },
    update: {},
    create: { email: config.seed.customer.email, locale: "en", source: "seed", confirmedAt: new Date() },
  });

  await prisma.storeSetting.upsert({
    where: { key: "brand" },
    update: {},
    create: {
      key: "brand",
      value: {
        name: "NORVA",
        tagline: "Style Without Limits",
        seoTitle: "Norva — Fashion, Clothing & Lifestyle Essentials",
        positioning: "A modern destination for fashion and everyday essentials.",
      } satisfies Prisma.InputJsonValue,
    },
  });

  return { categories: CATEGORIES.length, products: created };
}
