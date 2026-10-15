import { cn } from "@makkigo/ui";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MARKDOWN_REMARK_PLUGINS = [remarkGfm];

interface PolicyMarkdownProps {
  content: string;
  className?: string;
}

export default function PolicyMarkdown({ content, className }: Readonly<PolicyMarkdownProps>) {
  return (
    <section
      className={cn(
        "text-s leading-relaxed text-muted-foreground [&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:font-bold [&_h2]:text-foreground [&_h2:first-child]:mt-0 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-1 [&_td]:align-top [&_td]:wrap-anywhere [&_th]:border [&_th]:bg-background [&_th]:text-sm [&_td]:text-sm [&_th]:p-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:text-sm",
        className,
      )}
    >
      <Markdown remarkPlugins={MARKDOWN_REMARK_PLUGINS}>{content}</Markdown>
    </section>
  );
}
