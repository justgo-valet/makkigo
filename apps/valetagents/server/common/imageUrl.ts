import "server-only";

const toImageUrl = (baseUrl: string, path: string) => {
  const normalizedBaseUrl = new URL(baseUrl);
  const base = normalizedBaseUrl.toString().replace(/\/$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
};

export { toImageUrl };
