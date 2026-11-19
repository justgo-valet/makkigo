import { Button, Input } from "@makkigo/ui";

export default function SearchForm({ query, placeholder }: Readonly<{ query: string; placeholder: string }>) {
  return (
    <form className="mb-4 flex max-w-md gap-2" role="search">
      <Input name="q" defaultValue={query} placeholder={placeholder} aria-label={placeholder} className="bg-white" />
      <Button type="submit" variant="outline">
        검색
      </Button>
    </form>
  );
}
