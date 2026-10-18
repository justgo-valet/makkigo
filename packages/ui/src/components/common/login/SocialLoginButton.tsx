import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import Image from "next/image";

import { appleLogo, googleLogo, kakaoSymbol } from "../../../assets";
import { Button } from "../../ui/button";

import type { ReactNode } from "react";

type SocialLoginProvider = "kakao" | "google" | "apple";

interface SocialLoginButtonProps {
  provider: SocialLoginProvider;
  disabled: boolean;
  onClick: () => void;
}

const BUTTONS: Record<SocialLoginProvider, { label: string; className: string; icon: ReactNode }> =
  {
    kakao: {
      label: "카카오로 계속하기",
      className: "bg-[#FBE200] text-[#333333] hover:bg-[#FBE200] hover:text-[#333333]",
      icon: <Image src={kakaoSymbol} alt="" width={18} height={18} />,
    },
    google: {
      label: "Google로 계속하기",
      className:
        "border border-[#D0D5DD] bg-white text-[#333333] hover:bg-white hover:text-[#333333]",
      icon: (
        <span className="relative size-5 overflow-hidden">
          <Image
            src={googleLogo}
            alt=""
            width={160}
            height={160}
            className="absolute -top-[10px] -left-[10px] size-10 max-w-none"
          />
        </span>
      ),
    },
    apple: {
      label: "Apple로 계속하기",
      className: "bg-black text-white hover:bg-black hover:text-white",
      icon: <Image src={appleLogo} alt="" width={19} height={24} />,
    },
  };

function SocialLoginButton({ provider, disabled, onClick }: Readonly<SocialLoginButtonProps>) {
  const { label, className, icon } = BUTTONS[provider];

  return (
    <Button
      variant="ghost"
      className={`relative h-12 w-full rounded-[8px] p-0 text-[16px] font-semibold shadow-none [font-family:'Pretendard_Variable',Pretendard,sans-serif] ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="absolute left-4 flex size-5 items-center justify-center">{icon}</span>
      {label}
    </Button>
  );
}

export { SocialLoginButton };
export type { SocialLoginProvider };
