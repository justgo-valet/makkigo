import { Button } from "@makkigo/ui";
import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MARKDOWN_REMARK_PLUGINS = [remarkGfm];

interface ConsentPanelProps {
    id: string;
    title: string;
    content: string;
    onClose: () => void;
    onAgree: () => void;
}

export default function ConsentPanel({ id, title, content, onClose, onAgree }: Readonly<ConsentPanelProps>) {
    const handleAgree = () => {
        onAgree();
        onClose();
    };

    return (
        <div className="w-full h-screen fixed top-0 left-0 bg-white z-50" id={id}>
            <header className="p-4 flex items-center gap-2 justify-start h-16">
                <button type="button"  aria-label="약관 패널 닫기" onClick={onClose}>
                    <Image src="/icons/arrow_right.svg" alt="" width={20} height={20} aria-hidden />
                </button>
                <h1 className="text-lg font-bold">{title}</h1>
            </header>
            <section className="overflow-y-auto h-[calc(100vh-4rem-5rem)] px-6 pb-4 rounded-md text-s leading-relaxed text-muted-foreground [&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:font-bold [&_h2]:text-foreground [&_h2:first-child]:mt-0 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-1 [&_td]:align-top [&_th]:border [&_th]:bg-background [&_th]:text-sm [&_td]:text-sm [&_th]:p-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:text-sm">
                <Markdown remarkPlugins={MARKDOWN_REMARK_PLUGINS}>{content}</Markdown>
            </section>
            <footer className="p-4 flex w-full h-20">
                <Button type="button" onClick={handleAgree} className="w-full h-full text-base" aria-label={`${title} 동의`}>
                    동의
                </Button>
            </footer>
        </div>
    );
}
