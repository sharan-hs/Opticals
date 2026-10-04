// The API answers errors as { error: { code, message, details }, request_id }.

export const apiError = (error) => error?.data?.error ?? null;

export const apiErrorCode = (error) => apiError(error)?.code ?? null;

export const errorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error) return null;
  if (error.status === "FETCH_ERROR") {
    return "Can't reach the server. Check your connection and try again.";
  }
  return apiError(error)?.message ?? fallback;
};

// Pydantic prefixes custom messages with "Value error, ".
const cleanMessage = (message) => message.replace(/^Value error, /, "");

// Puts field-level validation errors from the API onto react-hook-form fields.
// Returns true if at least one field was marked.
export const applyFieldErrors = (error, setError, knownFields) => {
  const details = apiError(error)?.details;
  if (!Array.isArray(details)) return false;
  let applied = false;
  for (const detail of details) {
    if (detail.field && knownFields.includes(detail.field)) {
      setError(detail.field, { type: "server", message: cleanMessage(detail.message) });
      applied = true;
    }
  }
  return applied;
};
