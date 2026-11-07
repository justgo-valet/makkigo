import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 삭제 요청 | 마끼고 파트너",
  description: "마끼고 파트너 앱 계정과 데이터 삭제 방법",
};

const DATA_HANDLING = [
  {
    data: "소셜 계정 연결, 이름 · 휴대폰 번호, 로그인 정보, 알림 토큰, 알림 내역",
    handling: "탈퇴 즉시 삭제. Apple 로 가입했다면 Apple 에도 연결 해제를 요청",
  },
  {
    data: "직접 만든 부스, 관리하는 업체",
    handling: "탈퇴할 때 함께 닫혀 고객과 다른 요원에게 더 이상 보이지 않음",
  },
  {
    data: "사업장 정보(이름 · 주소 · 사진), 요금 정보, 입금 계좌",
    handling: "탈퇴 후 5년 보관 뒤 삭제 (문의 · 분쟁 대응)",
  },
  {
    data: "활동 기록(소속, 근무 시간, 처리 내역)",
    handling: "처리 후 5년 보관 뒤 삭제 (문의 · 분쟁 대응)",
  },
] as const;

const SECTION_TITLE_CLASS = "mt-4 mb-1 font-bold text-foreground";

export default function AccountDeletionPage() {
  return (
    <article className="h-full overflow-y-auto pt-2 pb-8 text-sm leading-relaxed break-keep text-muted-foreground">
      <h1 className="mb-4 text-xl font-bold text-(--base-color)">계정 삭제 요청</h1>
      <p>마끼고 파트너(오로라 주식회사) 앱 계정과 데이터를 지우는 방법입니다.</p>

      <h2 className={SECTION_TITLE_CLASS}>앱에서 바로 탈퇴하기</h2>
      <ol className="list-decimal pl-4">
        <li>마끼고 파트너 앱에 로그인합니다.</li>
        <li>
          화면 오른쪽 위 메뉴를 열어 <strong>설정</strong>으로 갑니다.
        </li>
        <li>
          맨 아래 <strong>회원탈퇴</strong>를 누르고 <strong>탈퇴하기</strong>로 확인합니다.
        </li>
      </ol>
      <p className="my-1.5">
        직접 만든 부스나 관리하는 업체에 진행 중인 발렛(도착 예정 · 주차 · 출차 요청 · 출차
        준비)이 있으면 모든 차가 출차된 뒤에 탈퇴할 수 있습니다.
      </p>

      <h2 className={SECTION_TITLE_CLASS}>앱을 쓸 수 없을 때</h2>
      <p className="my-1.5">
        이메일 <strong>dooininc@naver.com</strong> 으로 아래 내용을 보내 주세요. 본인 확인 뒤
        받은 날부터 10일 이내에 처리하고 결과를 회신합니다.
      </p>
      <ul className="list-disc pl-4">
        <li>제목: 마끼고 파트너 계정 삭제 요청</li>
        <li>가입한 소셜 계정 종류(카카오 · 구글 · Apple)와 그 계정의 이메일</li>
        <li>소속 부스 또는 관리하는 업체 이름</li>
      </ul>

      <h2 className={SECTION_TITLE_CLASS}>지우는 데이터와 보관하는 데이터</h2>
      <table className="my-2 w-full border-collapse">
        <thead>
          <tr>
            <th className="border bg-background p-1">데이터</th>
            <th className="border bg-background p-1">처리</th>
          </tr>
        </thead>
        <tbody>
          {DATA_HANDLING.map(({ data, handling }) => (
            <tr key={data}>
              <td className="border p-1 align-top wrap-anywhere">{data}</td>
              <td className="border p-1 align-top wrap-anywhere">{handling}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="my-1.5">보관하는 데이터는 분리하여 보관하고 보관 목적 외에는 쓰지 않습니다.</p>
    </article>
  );
}
