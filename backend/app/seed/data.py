"""Starting catalogue: the products the Phase 1 site showed (frontend/src/Data/catalog.js),
regrouped as frame models with colour variants.

Only facts we have are filled in. MRP is set to the listed price (no discount
shown) and stock starts at 0 until the owner enters real counts.
"""

from dataclasses import dataclass, field

from app.models.enums import ColorFamily, FrameMaterial, FrameShape

# Two levels: (name, slug, [(sub name, sub slug), ...])
CATEGORIES: list[tuple[str, str, list[tuple[str, str]]]] = [
    (
        "Eyeglasses",
        "eyeglasses",
        [
            ("Reading Glasses", "reading-glasses"),
            ("Blue Light Glasses", "blue-light-glasses"),
            ("Kids Eyeglasses", "kids-eyeglasses"),
        ],
    ),
    ("Sunglasses", "sunglasses", []),
    ("Contact Lenses", "contact-lenses", []),
    ("Accessories", "accessories", []),
]

BRANDS: list[tuple[str, str]] = [("Ray-Ban", "ray-ban")]

# HSN chapter for spectacles, goggles and sunglasses. Confirm the full code and
# GST rate with the shop's CA before invoices are issued.
SUNGLASSES_HSN = "9004"


@dataclass(frozen=True)
class VariantSeed:
    # Cloudinary folder of the existing images: Products/{image_folder}/{image_folder}_{n}
    image_folder: str
    color_name: str
    color_family: ColorFamily
    color_hex: str
    price_rupees: int
    image_count: int
    image_version: int | None = None

    @property
    def sku(self) -> str:
        return self.image_folder.upper().replace("_", "-")


@dataclass(frozen=True)
class ProductSeed:
    model_number: str
    name: str
    slug: str
    variants: list[VariantSeed]
    frame_shape: FrameShape | None = None
    frame_material: FrameMaterial | None = None
    brand_slug: str = "ray-ban"
    category_slug: str = "sunglasses"
    hsn_code: str = SUNGLASSES_HSN
    specifications: list[dict[str, str]] = field(default_factory=list)


PRODUCTS: list[ProductSeed] = [
    ProductSeed(
        model_number="RB2132",
        name="New Wayfarer",
        slug="ray-ban-new-wayfarer-rb2132",
        frame_shape=FrameShape.WAYFARER,
        variants=[VariantSeed("orb2132", "Black", ColorFamily.BLACK, "#000000", 12490, 6)],
    ),
    ProductSeed(
        model_number="RB3119M",
        name="Olympian Deluxe",
        slug="ray-ban-olympian-deluxe-rb3119m",
        variants=[VariantSeed("orb3119m", "Arista Gold", ColorFamily.GOLD, "#D6BB4F", 12490, 5)],
    ),
    ProductSeed(
        model_number="RB3447",
        name="Round Metal",
        slug="ray-ban-round-metal-rb3447",
        frame_shape=FrameShape.ROUND,
        frame_material=FrameMaterial.METAL,
        variants=[VariantSeed("orb3447", "Arista Gold", ColorFamily.GOLD, "#D6BB4F", 12490, 6)],
    ),
    ProductSeed(
        model_number="RB3735",
        name="Bain Bridge",
        slug="ray-ban-bain-bridge-rb3735",
        variants=[VariantSeed("orb3735", "Rose Gold", ColorFamily.ROSE_GOLD, "#E5AE95", 11790, 5)],
    ),
    ProductSeed(
        model_number="RB4089",
        name="Balorama",
        slug="ray-ban-balorama-rb4089",
        variants=[
            VariantSeed("orb4089_opal", "Opal Blue", ColorFamily.BLUE, "#B0D6E8", 10990, 6),
            VariantSeed("orb4089_black", "Black", ColorFamily.BLACK, "#000000", 10990, 6),
        ],
    ),
    ProductSeed(
        model_number="RB4349",
        name="RB4349",
        slug="ray-ban-rb4349",
        variants=[
            VariantSeed(
                "orb4349_brown", "Transparent Brown", ColorFamily.BROWN, "#9C7539", 6490, 6
            ),
            # Images were re-uploaded; the version busts the CDN cache.
            VariantSeed(
                "orb4349_havana", "Havana", ColorFamily.TORTOISE, "#7B3F00", 7190, 6, 1775294749
            ),
            VariantSeed(
                "orb4349_green", "Transparent Green", ColorFamily.GREEN, "#BFDCC4", 6490, 6
            ),
        ],
    ),
    ProductSeed(
        model_number="RB4940",
        name="Wayfarer Puffer",
        slug="ray-ban-wayfarer-puffer-rb4940",
        frame_shape=FrameShape.WAYFARER,
        variants=[
            VariantSeed("orb4940_fucsia", "Fuchsia", ColorFamily.PINK, "#D76B67", 12490, 6),
            VariantSeed("orb4940_blue", "Blue", ColorFamily.BLUE, "#0B2472", 12490, 6),
        ],
    ),
]

# Settings the admin can change later; seeding never overwrites an existing value.
STORE_SETTINGS: dict[str, object] = {
    # Owner to confirm (docs/TASKS.md 0.4): fee, free-shipping threshold, regions.
    "shipping_fee_paise": 0,
    "free_shipping_threshold_paise": None,
    "payment_window_minutes": 30,
    "low_stock_threshold_default": 3,
}
