import { cn } from "cn";
import React from "react";

type BaseImageProps = Omit<
    React.ComponentProps<"img">,
    "alt" | "aria-label" | "aria-labelledby"
>;

type ImageProps = BaseImageProps &
    (
        | { alt: string; "aria-label"?: string; "aria-labelledby"?: string }
        | { alt?: string; "aria-label": string; "aria-labelledby"?: string }
        | { alt?: string; "aria-label"?: string; "aria-labelledby": string }
    );

function Image({ className, alt, ...props }: ImageProps) {
    return (
        <img
            alt={alt ?? ""}
            data-slot="image"
            className={cn(className)}
            {...props}
        />
    );
}

export { Image };
