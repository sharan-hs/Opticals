// Cloud names are public; the env var allows a separate staging account.
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dyf8dp9oo";
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

// Builds a delivery URL. f_auto/q_auto let Cloudinary pick WebP/AVIF and a
// sensible quality; passing `width` resizes on the CDN.
export const cloudinaryUrl = (publicId, { width, version } = {}) => {
  const transformations = ["f_auto", "q_auto"];
  if (width) transformations.push("c_fit", `w_${width}`);

  return [BASE_URL, transformations.join(","), version && `v${version}`, publicId]
    .filter(Boolean)
    .join("/");
};

export const cloudinarySrcSet = (publicId, widths, { version } = {}) =>
  widths
    .map((width) => `${cloudinaryUrl(publicId, { width, version })} ${width}w`)
    .join(", ");

// Image objects from the API: { public_id, version, alt_text, ... }.
export const imageUrl = (image, width) =>
  image ? cloudinaryUrl(image.public_id, { width, version: image.version }) : null;
