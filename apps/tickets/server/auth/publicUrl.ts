import "server-only";

export const toPublicUrl = (path: string) => {
  const publicUrl = process.env.PUBLIC_URL?.trim();
  if (!publicUrl) throw new Error("환경변수 PUBLIC_URL 이 설정되지 않았습니다.");
  return new URL(path, publicUrl);
};
