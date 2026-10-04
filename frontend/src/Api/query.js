// Query strings the API understands: lists repeat the key (?color=A&color=B)
// and empty values are left out.
export const toQueryString = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, item));
    } else if (value !== undefined && value !== null && value !== "" && value !== false) {
      search.append(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};
