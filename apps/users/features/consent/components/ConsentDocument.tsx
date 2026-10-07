import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const remarkPlugins = [remarkGfm];

interface ConsentDocumentProps {
  id: string;
  content: string;
}

export default function ConsentDocument({ id, content }: Readonly<ConsentDocumentProps>) {
  return (
    <div
      id={id}
      className="max-h-64 overflow-y-auto rounded-md bg-muted px-3 py-3 text-xs leading-relaxed text-muted-foreground [&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:font-bold [&_h2]:text-foreground [&_h2:first-child]:mt-0 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-1 [&_td]:align-top [&_th]:border [&_th]:bg-background [&_th]:p-1 [&_ul]:list-disc [&_ul]:pl-4"
    >
      <Markdown remarkPlugins={remarkPlugins}>{content}</Markdown>
    </div>
  );
}
