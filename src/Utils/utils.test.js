import { cloudinaryUrl, cloudinarySrcSet, productImageIds, productImageUrl } from "./cloudinary";
import { formatINR } from "./format";

const BASE = "https://res.cloudinary.com/dyf8dp9oo/image/upload";

describe("cloudinary", () => {
  test("builds URLs without empty path segments", () => {
    expect(cloudinaryUrl("Products/x/x_1.png")).toBe(`${BASE}/f_auto,q_auto/Products/x/x_1.png`);
    expect(cloudinaryUrl("Products/x/x_1.png", { width: 600, version: "123" })).toBe(
      `${BASE}/f_auto,q_auto,c_fit,w_600/v123/Products/x/x_1.png`
    );
  });

  test("srcSet lists each width", () => {
    expect(cloudinarySrcSet("p", [300, 600])).toBe(
      `${BASE}/f_auto,q_auto,c_fit,w_300/p 300w, ${BASE}/f_auto,q_auto,c_fit,w_600/p 600w`
    );
  });

  test("uses each product's own image count and version", () => {
    const product = { id: "orb3735", imageCount: 5, imageVersion: "9" };
    expect(productImageIds(product)).toHaveLength(5);
    expect(productImageIds(product)[4]).toBe("Products/orb3735/orb3735_5.png");
    expect(productImageUrl(product, 0, 300)).toBe(
      `${BASE}/f_auto,q_auto,c_fit,w_300/v9/Products/orb3735/orb3735_1.png`
    );
  });
});

test("formatINR uses rupees and Indian digit grouping", () => {
  expect(formatINR(12490)).toBe("₹12,490");
  expect(formatINR(1234567)).toBe("₹12,34,567");
});
