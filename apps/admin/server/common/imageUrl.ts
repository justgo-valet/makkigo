import "server-only";

export const toImageUrl = (path: string) => {
  const value = process.env.IMAGE_BASE_URL?.trim();
  if (!value) throw new Error("환경변수 IMAGE_BASE_URL 이 설정되지 않았습니다.");
  return new URL(path.replace(/^\/+/, ""), value.endsWith("/") ? value : `${value}/`).toString();
};
