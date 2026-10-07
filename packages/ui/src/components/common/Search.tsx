"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "../../lib/utils";

interface SearchboxProps {
    size: "s" | "m" | "l";
    placeholder?: string;
    rounded?: boolean;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const sizeClassName = {
    s: "h-8",
    m: "h-12",
    l: "h-16",
};

function Searchbox({
    className,
    size,
    placeholder,
    rounded,
    onChange,
    ...props
}: Omit<React.ComponentProps<"div">, keyof SearchboxProps> & SearchboxProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");

    const handleClear = () => {
        const input = inputRef.current;
        if (!input) return;

        input.value = "";
        setValue("");
        onChange?.({ target: input, currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
        input.focus();
    };

    return (
        <div
            className={cn(
                "flex w-full items-center border border-gray-300 px-2",
                sizeClassName[size],
                rounded ? "rounded-full" : "rounded-xs",
                className,
            )}
            {...props}
        >
            <input
                ref={inputRef}
                type="text"
                value={value}
                placeholder={placeholder}
                className="h-full w-full bg-transparent px-2 outline-none placeholder-gray-400"
                onChange={(event) => {
                    setValue(event.target.value);
                    onChange?.(event);
                }}
            />
            {value ? (
                <button
                    type="button"
                    aria-label="검색어 지우기"
                    className="mr-2 shrink-0 cursor-pointer"
                    onClick={handleClear}
                >
                    <XIcon aria-hidden className="size-5 text-black" />
                </button>
            ) : (
                <SearchIcon aria-hidden className="mr-2 size-5 shrink-0 text-neutral-500" />
            )}
        </div>
    );
}

export default Searchbox;
