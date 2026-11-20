import "server-only";

export const toImageUrl = (baseUrl: string, path: string) =>
  `${new URL(baseUrl).toString().replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
