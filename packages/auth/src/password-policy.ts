export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

const LOGIN_ID_PATTERN = /^[a-z0-9._-]{4,32}$/;

export const normalizeLoginId = (value: string) => {
  const loginId = value.trim().toLowerCase();
  return LOGIN_ID_PATTERN.test(loginId) ? loginId : null;
};

export const isValidPassword = (value: string) =>
  value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH;
