"use client";

import { useRef } from "react";

interface InlineTicketTextProps {
  text: string;
  autoFocus: boolean;
  onChange: (text: string) => void;
  onFocus: () => void;
}

const MAX_LENGTH = 200;

export default function InlineTicketText({ text, autoFocus, onChange, onFocus }: InlineTicketTextProps) {
  const composing = useRef(false);
  const initialized = useRef(false);

  const commit = (element: HTMLDivElement) => {
    const value = element.innerText.replace(/\r\n/g, "\n").replace(/\n$/, "");
    if (value.length > MAX_LENGTH) {
      element.textContent = value.slice(0, MAX_LENGTH);
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    onChange(value.slice(0, MAX_LENGTH));
  };

  return (
    <div
      ref={(element) => {
        if (!element) return;
        // Leave the active DOM alone so React updates never reset the caret or IME.
        if (document.activeElement !== element) element.textContent = text;
        if (!initialized.current && autoFocus) {
          element.textContent = text;
          element.focus();
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        initialized.current = true;
      }}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="티켓 글자"
      aria-multiline="true"
      data-placeholder="글자를 입력하세요"
      className="h-full w-full cursor-text overflow-hidden whitespace-pre-wrap wrap-anywhere outline-none empty:before:text-(--tertiary-color) empty:before:content-[attr(data-placeholder)]"
      onFocus={onFocus}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") event.currentTarget.blur();
      }}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={(event) => { composing.current = false; commit(event.currentTarget); }}
      onInput={(event) => { if (!composing.current) commit(event.currentTarget); }}
      onBlur={(event) => { if (!composing.current) commit(event.currentTarget); }}
      onPaste={(event) => {
        event.preventDefault();
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(event.clipboardData.getData("text/plain"));
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        commit(event.currentTarget);
      }}
    />
  );
}
