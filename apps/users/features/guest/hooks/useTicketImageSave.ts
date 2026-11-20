import { useRef, useState } from "react";

const SAVE_ERROR_MESSAGE = "티켓 이미지를 저장하지 못했어요. 화면을 캡처해 주세요.";

type SaveState = "idle" | "saving" | "tap-again";

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const deliver = async (file: File) => {
  if (!navigator.canShare?.({ files: [file] })) {
    downloadFile(file);
    return "done" as const;
  }
  try {
    await navigator.share({ files: [file] });
    return "done" as const;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "done" as const;
    if (error instanceof DOMException && error.name === "NotAllowedError")
      return "needs-tap" as const;
    throw error;
  }
};

const renderTicketImage = async (node: HTMLElement, fileName: string) => {
  const { toBlob } = await import("html-to-image");
  const options = { pixelRatio: 3, skipFonts: true, backgroundColor: "#ffffff" };
  await toBlob(node, options);
  const blob = await toBlob(node, options);
  if (!blob) throw new Error("empty ticket image");
  return new File([blob], fileName, { type: "image/png" });
};

const useTicketImageSave = () => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<File | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const save = async (fileName: string) => {
    const node = ticketRef.current;
    if (!node || state === "saving") return;
    setErrorMessage(null);
    try {
      if (state === "tap-again" && fileRef.current) {
        const result = await deliver(fileRef.current);
        setState(result === "needs-tap" ? "tap-again" : "idle");
        return;
      }
      setState("saving");
      fileRef.current = await renderTicketImage(node, fileName);
      setState((await deliver(fileRef.current)) === "needs-tap" ? "tap-again" : "idle");
    } catch {
      setState("idle");
      setErrorMessage(SAVE_ERROR_MESSAGE);
    }
  };

  return {
    ticketRef,
    isSaving: state === "saving",
    needsTap: state === "tap-again",
    errorMessage,
    save,
  };
};

export { useTicketImageSave };
