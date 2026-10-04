const CLOUD_NAME = "dyf8dp9oo";

export const getProductImages = (productID, count = 6) => {
  const versionMap = {
    orb4349_havana: "v1775294749",
    // add others ONLY if needed
  };

  const version = versionMap[productID] || "";

  return Array.from({ length: count }, (_, i) => {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${version}/Products/${productID}/${productID}_${i + 1}.png`;
  });
};