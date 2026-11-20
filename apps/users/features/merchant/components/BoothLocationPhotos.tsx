import Image from "next/image";

import type { MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";

type MerchantBooth = MerchantDetail["booths"][number];

export default function BoothLocationPhotos({ booths }: Readonly<{ booths: MerchantBooth[] }>) {
  const hasManyBooths = booths.length > 1;
  const boothsWithPhotos = booths.filter((booth) => booth.photoUrls.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {boothsWithPhotos.map((booth) => (
        <div key={booth.id} className="flex flex-col gap-2">
          {hasManyBooths && <BoothName name={booth.name} />}
          <PhotoStrip
            label={hasManyBooths ? `${booth.name} 위치 사진` : "부스 위치 사진"}
            altPrefix={hasManyBooths ? `${booth.name} 위치 사진` : "부스 위치 사진"}
            urls={booth.photoUrls}
          />
        </div>
      ))}
    </div>
  );
}

export function BoothName({ name }: Readonly<{ name: string }>) {
  return <p className="text-xs font-medium break-keep text-(--tertiary-color)">{name}</p>;
}

export function PhotoStrip({
  label,
  altPrefix,
  urls,
}: Readonly<{ label: string; altPrefix: string; urls: string[] }>) {
  if (urls.length === 0) return null;

  return (
    <ul
      aria-label={label}
      className="flex shrink-0 snap-x gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
    >
      {urls.map((url, index) => (
        <li
          key={url}
          className="relative h-[88px] w-[120px] shrink-0 snap-start overflow-hidden rounded-lg bg-slate-100"
        >
          <Image
            src={url}
            alt={`${altPrefix} ${index + 1}`}
            fill
            unoptimized
            className="object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
