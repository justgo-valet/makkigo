type SocialProvider = "KAKAO" | "GOOGLE" | "APPLE";

interface StaffSocialAccount {
  id: number;
  provider: SocialProvider;
  email: string | null;
}

export type { SocialProvider, StaffSocialAccount };
