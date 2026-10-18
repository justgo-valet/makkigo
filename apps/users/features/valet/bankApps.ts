/**
 * 입금하기 시트에 보여줄 은행 앱 목록.
 *
 * 앱(makkigo-mobile)은 여기 적힌 스킴을 Android `<queries>` · iOS `LSApplicationQueriesSchemes` 에
 * 미리 등록해 두어야 설치 여부를 알 수 있다. 스킴을 더하거나 바꾸면 앱 PR 도 함께 낸다.
 * 한 은행에 스킴 후보가 여럿이면 앞에서부터 설치된 첫 스킴을 쓴다.
 */
interface BankApp {
  id: string;
  name: string;
  schemes: readonly string[];
}

interface InstalledBankApp {
  id: string;
  name: string;
  scheme: string;
  /** 받는 계좌 · 금액을 채운 송금 화면까지 열어 준다 (토스만) */
  prefillsTransfer: boolean;
}

interface BankTransferAccount {
  bankName: string;
  accountNumber: string;
}

interface BankTransferTarget extends BankTransferAccount {
  amount: number | null;
}

const TOSS_SCHEME = "supertoss";

const BANK_APPS: readonly BankApp[] = [
  { id: "toss", name: "토스", schemes: [TOSS_SCHEME] },
  { id: "kakaobank", name: "카카오뱅크", schemes: ["kakaobank"] },
  { id: "kakaopay", name: "카카오페이", schemes: ["kakaopay"] },
  { id: "kb", name: "KB스타뱅킹", schemes: ["kbbank"] },
  { id: "shinhan", name: "신한 SOL뱅크", schemes: ["shinhansol"] },
  { id: "nh", name: "NH올원뱅크", schemes: ["nhallone", "nhallonebank"] },
  { id: "woori", name: "우리WON뱅킹", schemes: ["newsmartpib", "wooribank"] },
  { id: "hana", name: "하나원큐", schemes: ["hanapush"] },
  { id: "ibk", name: "IBK i-ONE뱅크", schemes: ["ionebank"] },
  { id: "kbank", name: "케이뱅크", schemes: ["ukbanksmartbank"] },
];

const getBankAppSchemes = () => BANK_APPS.flatMap((app) => app.schemes);

const getInstalledBankApps = (installedSchemes: readonly string[]): InstalledBankApp[] =>
  BANK_APPS.flatMap((app) => {
    const scheme = app.schemes.find((candidate) => installedSchemes.includes(candidate));

    return scheme
      ? [{ id: app.id, name: app.name, scheme, prefillsTransfer: scheme === TOSS_SCHEME }]
      : [];
  });

/**
 * 은행 앱을 여는 주소. 토스는 받는 계좌 · 금액을 채운 송금 화면(`supertoss://send`)으로,
 * 나머지는 앱 실행까지만 (계좌번호는 클립보드에 복사해 둔다).
 */
const buildBankAppUrl = (scheme: string, target: BankTransferTarget) => {
  if (scheme !== TOSS_SCHEME) return `${scheme}://`;

  const params = new URLSearchParams({
    bank: target.bankName,
    accountNo: target.accountNumber.replace(/\D/g, ""),
  });

  if (target.amount !== null && target.amount > 0) params.set("amount", String(target.amount));

  return `${TOSS_SCHEME}://send?${params.toString()}`;
};

export { buildBankAppUrl, getBankAppSchemes, getInstalledBankApps };
export type { BankTransferAccount, InstalledBankApp };
