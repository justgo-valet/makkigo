import { useRef, useState } from "react";

import { getDevicePlatform } from "@/libs/device/getDevicePlatform";

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
  const isAndroid = getDevicePlatform(navigator.userAgent) === "android";
  if (isAndroid || !navigator.canShare?.({ files: [file] })) {
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

const pad = (value: number) => String(value).padStart(2, "0");

const withSavedTime = (fileName: string, savedAt: Date) => {
  const date = `${savedAt.getFullYear()}${pad(savedAt.getMonth() + 1)}${pad(savedAt.getDate())}`;
  const time = `${pad(savedAt.getHours())}${pad(savedAt.getMinutes())}${pad(savedAt.getSeconds())}`;
  return fileName.replace(/\.png$/, `-${date}-${time}.png`);
};

const renderTicketImage = async (node: HTMLElement, fileName: string) => {
  const { toBlob } = await import("html-to-image");
  const frame = document.createElement("div");
  frame.style.cssText = `position:fixed;top:0;left:-10000px;width:${node.offsetWidth}px`;
  const copy = node.cloneNode(true) as HTMLElement;
  copy.dataset.capture = "";
  frame.append(copy);
  document.body.append(frame);
  try {
    const options = { pixelRatio: 3, backgroundColor: "#ffffff", style: { margin: "0" } };
    await toBlob(copy, options);
    const blob = await toBlob(copy, options);
    if (!blob) throw new Error("empty ticket image");
    return new File([blob], withSavedTime(fileName, new Date()), { type: "image/png" });
  } finally {
    frame.remove();
  }
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
