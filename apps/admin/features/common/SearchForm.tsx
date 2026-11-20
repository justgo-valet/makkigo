import { Button, Input } from "@makkigo/ui";

import type { ReactNode } from "react";

export default function SearchForm({
  query,
  placeholder,
  children,
}: Readonly<{ query: string; placeholder: string; children?: ReactNode }>) {
  return (
    <form className="mb-4 flex max-w-xl items-center gap-2" role="search">
      <Input name="q" defaultValue={query} placeholder={placeholder} aria-label={placeholder} className="max-w-md bg-white" />
      {children}
      <Button type="submit" variant="outline">
        검색
      </Button>
    </form>
  );
}
