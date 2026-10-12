export default function SheetCloseButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      aria-label="닫기"
      className="-m-[13px] flex size-11 shrink-0 items-center justify-center text-(--base-color)"
      onClick={onClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
