import toast from "react-hot-toast";

const baseOptions = { duration: 2000 };

export const notify = {
  success: (message) =>
    toast.success(message, {
      ...baseOptions,
      style: { backgroundColor: "#07bc0c", color: "white" },
      iconTheme: { primary: "#fff", secondary: "#07bc0c" },
    }),
  error: (message) =>
    toast.error(message, {
      ...baseOptions,
      style: { backgroundColor: "#ff4b4b", color: "white" },
      iconTheme: { primary: "#fff", secondary: "#ff4b4b" },
    }),
};
