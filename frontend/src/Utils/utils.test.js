import { cloudinaryUrl, cloudinarySrcSet, imageUrl } from "./cloudinary";
import { formatINR, formatPaise } from "./format";
import { toQueryString } from "../Api/query";

const BASE = "https://res.cloudinary.com/dyf8dp9oo/image/upload";

describe("cloudinary", () => {
  test("builds URLs without empty path segments", () => {
    expect(cloudinaryUrl("Products/x/x_1")).toBe(`${BASE}/f_auto,q_auto/Products/x/x_1`);
    expect(cloudinaryUrl("Products/x/x_1", { width: 600, version: 123 })).toBe(
      `${BASE}/f_auto,q_auto,c_fit,w_600/v123/Products/x/x_1`
    );
  });

  test("srcSet lists each width", () => {
    expect(cloudinarySrcSet("p", [300, 600])).toBe(
      `${BASE}/f_auto,q_auto,c_fit,w_300/p 300w, ${BASE}/f_auto,q_auto,c_fit,w_600/p 600w`
    );
  });

  test("image objects from the API", () => {
    expect(imageUrl({ public_id: "Products/a/a_1", version: 9 }, 300)).toBe(
      `${BASE}/f_auto,q_auto,c_fit,w_300/v9/Products/a/a_1`
    );
    expect(imageUrl(null, 300)).toBeNull();
  });
});

test("money formatting", () => {
  expect(formatINR(12490)).toBe("₹12,490");
  expect(formatINR(1234567)).toBe("₹12,34,567");
  expect(formatPaise(1249000)).toBe("₹12,490");
  expect(formatPaise(1249050)).toBe("₹12,490.5");
});

test("query strings repeat list keys and skip empty values", () => {
  expect(toQueryString({ color: ["BLUE", "BLACK"], q: "", page: 2, in_stock: false, x: undefined })).toBe(
    "?color=BLUE&color=BLACK&page=2"
  );
  expect(toQueryString({})).toBe("");
});
