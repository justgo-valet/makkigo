import Image from "next/image";

import { loginIllustration, makkigoLogoWhite } from "../../../assets";
import { FieldError } from "../../ui/field";
import { SocialLoginButton } from "./SocialLoginButton";

import type { SocialLoginProvider } from "./SocialLoginButton";

interface LoginScreenProps {
  providers: readonly SocialLoginProvider[];
  disabled: boolean;
  errorMessage: string | null;
  onLogin: (provider: SocialLoginProvider) => void;
}

function LoginScreen({ providers, disabled, errorMessage, onLogin }: Readonly<LoginScreenProps>) {
  return (
    <div className="fixed inset-0 flex justify-center overflow-y-auto bg-(--surface-color)">
      <div className="flex flex-col w-full min-h-dvh max-w-md bg-[#0970E9]">
        <div className="flex shrink-0 flex-col items-center gap-[clamp(20px,5vh,40px)] px-6 pt-[calc(clamp(32px,8vh,96px)+var(--safe-area-inset-top))]">
          <h1>
            <Image src={makkigoLogoWhite} alt="마끼고" width={224} height={91} priority className="translate-x-5" />
          </h1>
          <p className="text-xl font-bold tracking-tight text-white">
            주차는 <span className="text-2xl text-[#F5C518]">맡기고,</span> 편하게 가세요
          </p>
        </div>
        <div className="relative flex-1 min-h-28 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_45%)]">
          <Image
            src={loginIllustration}
            alt=""
            aria-hidden
            priority
            sizes="(max-width: 448px) 100vw, 448px"
            className="absolute bottom-0 left-0 w-full h-auto"
          />
        </div>
        <div className="relative -mt-7 flex shrink-0 flex-col gap-3 rounded-t-[28px] bg-(--surface-color) px-6 pt-[clamp(24px,4dvh,32px)] pb-[calc(clamp(24px,4dvh,32px)+var(--safe-area-inset-bottom))]">
          {errorMessage && <FieldError className="text-center">{errorMessage}</FieldError>}
          {providers.map((provider) => (
            <SocialLoginButton
              key={provider}
              provider={provider}
              disabled={disabled}
              onClick={() => onLogin(provider)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { LoginScreen };
