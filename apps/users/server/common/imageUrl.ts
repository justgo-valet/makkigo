import "server-only";

const getImageBaseUrl = () => {
  const value = process.env.IMAGE_BASE_URL?.trim();

  if (!value) {
    throw new Error("환경변수 IMAGE_BASE_URL 이 설정되지 않았습니다.");
  }

  return value.endsWith("/") ? value : `${value}/`;
};

const toImageUrl = (path: string) => new URL(path, getImageBaseUrl()).toString();

export { toImageUrl };
