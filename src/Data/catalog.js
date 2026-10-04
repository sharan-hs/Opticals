// Static product catalogue used until the backend API exists (Phase 5).
// `id` doubles as the Cloudinary folder name: Products/{id}/{id}_{n}.png
// Products sharing a `model` are colour variants of the same frame.

const products = [
  {
    id: "orb2132",
    slug: "ray-ban-wayfarer-901",
    model: "RB2132",
    name: "Wayfarer 901",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Black",
    colorHex: "#000000",
    price: 12490,
    imageCount: 6,
  },
  {
    id: "orb3119m",
    slug: "ray-ban-olympian-deluxe-arista-gold",
    model: "RB3119M",
    name: "Olympian Deluxe 001-31 Arista Gold",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Gold",
    colorHex: "#D6BB4F",
    price: 12490,
    imageCount: 5,
  },
  {
    id: "orb3447",
    slug: "ray-ban-round-metal-arista-gold",
    model: "RB3447",
    name: "Round Metal 001-BH Arista Gold",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Gold",
    colorHex: "#D6BB4F",
    price: 12490,
    imageCount: 6,
  },
  {
    id: "orb3735",
    slug: "ray-ban-bain-bridge-rose-gold",
    model: "RB3735",
    name: "Bain Bridge 9202R5 Rose Gold",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Rose Gold",
    colorHex: "#E5AE95",
    price: 11790,
    imageCount: 5,
  },
  {
    id: "orb4089_opal",
    slug: "ray-ban-balorama-opal-blue",
    model: "RB4089",
    name: "Balorama Opal Blue",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Opal Blue",
    colorHex: "#B0D6E8",
    price: 10990,
    imageCount: 6,
  },
  {
    id: "orb4089_black",
    slug: "ray-ban-balorama-black",
    model: "RB4089",
    name: "Balorama Black",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Black",
    colorHex: "#000000",
    price: 10990,
    imageCount: 6,
  },
  {
    id: "orb4349_brown",
    slug: "ray-ban-rb4349-transparent-brown",
    model: "RB4349",
    name: "RB4349 Transparent Brown",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Transparent Brown",
    colorHex: "#9C7539",
    price: 6490,
    imageCount: 6,
  },
  {
    id: "orb4349_havana",
    slug: "ray-ban-rb4349-havana",
    model: "RB4349",
    name: "RB4349 Havana",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Havana",
    colorHex: "#7B3F00",
    price: 7190,
    imageCount: 6,
    // Images were re-uploaded; the version busts the CDN cache.
    imageVersion: "1775294749",
  },
  {
    id: "orb4349_green",
    slug: "ray-ban-rb4349-transparent-green",
    model: "RB4349",
    name: "RB4349 Transparent Green",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Transparent Green",
    colorHex: "#BFDCC4",
    price: 6490,
    imageCount: 6,
  },
  {
    id: "orb4940_fucsia",
    slug: "ray-ban-wayfarer-puffer-fuchsia",
    model: "RB4940",
    name: "Wayfarer Puffer Fuchsia",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Fuchsia",
    colorHex: "#D76B67",
    price: 12490,
    imageCount: 6,
  },
  {
    id: "orb4940_blue",
    slug: "ray-ban-wayfarer-puffer-blue",
    model: "RB4940",
    name: "Wayfarer Puffer Blue",
    brand: "Ray-Ban",
    category: "Sunglasses",
    color: "Blue",
    colorHex: "#0B2472",
    price: 12490,
    imageCount: 6,
  },
];

export const getProducts = () => products;

export const getProductBySlug = (slug) =>
  products.find((product) => product.slug === slug);

export const getProductById = (id) =>
  products.find((product) => product.id === id);

// Other colours of the same frame model, including the product itself.
export const getColorSiblings = (product) =>
  products.filter((p) => p.model === product.model);

export const getRelatedProducts = (product, limit = 8) =>
  products
    .filter((p) => p.id !== product.id && p.model !== product.model)
    .sort(
      (a, b) =>
        Number(b.category === product.category) -
        Number(a.category === product.category)
    )
    .slice(0, limit);
