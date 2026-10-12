import { Suspense } from "react";

import HomeContent from "@/features/home/components/HomeContent";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""} />
    </Suspense>
  );
}
