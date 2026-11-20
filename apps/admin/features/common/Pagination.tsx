import { buttonVariants } from "@makkigo/ui";
import Link from "next/link";

export default function Pagination({
  page,
  pageCount,
  href,
}: Readonly<{ page: number; pageCount: number; href: (page: number) => string }>) {
  if (pageCount <= 1) return null;
  const link = (target: number, label: string) =>
    target < 1 || target > pageCount ? (
      <span className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
        {label}
      </span>
    ) : (
      <Link href={href(target)} className={buttonVariants({ variant: "outline", size: "sm" })}>
        {label}
      </Link>
    );

  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      {link(page - 1, "이전")}
      <span className="px-2 text-(--tertiary-color)">
        {page} / {pageCount}
      </span>
      {link(page + 1, "다음")}
    </div>
  );
}
