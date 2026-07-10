export const setAccessToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", token);
  }
};

export const getAccessToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

export const clearAccessToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
  }
};
