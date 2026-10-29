import { Button } from "@makkigo/ui";
import Link from "next/link";

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: Readonly<ComingSoonProps>) {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-xl font-bold text-(--base-color)">{title}</h1>
      </div>
      <Button asChild size="xl" className="w-full">
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  );
}
