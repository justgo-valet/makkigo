import { Button } from "@makkigo/ui";
import Link from "next/link";

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: Readonly<ComingSoonProps>) {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-2 pb-[17px]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-2xl leading-8 font-medium text-(--base-color)">{title}</h1>
      </div>
      <Button asChild className="h-14 w-full rounded-[6px] text-lg font-medium">
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  );
}
