import React from "react";

import { cloudinarySrcSet, imageUrl } from "../../Utils/cloudinary";

// Responsive Cloudinary image for API image objects. `width`/`height` reserve
// space (no layout shift); `sizes` tells the browser which width to fetch.
const CloudImage = ({
  image,
  alt,
  widths = [300, 600],
  sizes,
  width,
  height,
  loading = "lazy",
  className,
}) => {
  if (!image) {
    return <div className={`imagePlaceholder ${className ?? ""}`} style={{ aspectRatio: `${width} / ${height}` }} />;
  }
  return (
    <img
      className={className}
      src={imageUrl(image, widths[widths.length - 1])}
      srcSet={cloudinarySrcSet(image.public_id, widths, { version: image.version })}
      sizes={sizes}
      alt={alt ?? image.alt_text ?? ""}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
    />
  );
};

export default CloudImage;
