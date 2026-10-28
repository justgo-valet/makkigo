import { Suspense } from "react";

import HomeContent from "@/features/home/components/HomeContent";

export default function HomePage() {
  return (
    <>
      {/* 요원 앱 홈과 같은 옅은 회색 바탕. 앱 하단 홈 인디케이터 뒤까지 깔린다. */}
      <div className="fixed inset-0 -z-10 bg-(--surface-color)" />
      <Suspense fallback={null}>
        <HomeContent kakaoMapAppKey={process.env.KAKAO_MAP_APP_KEY ?? ""} />
      </Suspense>
    </>
  );
}
