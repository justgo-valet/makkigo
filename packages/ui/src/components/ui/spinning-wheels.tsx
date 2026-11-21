import * as React from "react"

type Wheel = { left: string; top: string; height: string; squash: number }

const PHOTO_WHEELS: Wheel[] = [
  { left: "46%", top: "75%", height: "25%", squash: 0.84 },
  { left: "84.5%", top: "73%", height: "25%", squash: 0.73 },
]

const SIDE_VIEW_WHEELS: Wheel[] = [
  { left: "22.4%", top: "64.5%", height: "26%", squash: 1 },
  { left: "76%", top: "64.5%", height: "26%", squash: 1 },
]

function SpinningWheels({ sideView }: { sideView: boolean }) {
  return (
    <>
      {(sideView ? SIDE_VIEW_WHEELS : PHOTO_WHEELS).map((wheel) => (
        <span
          key={wheel.left}
          aria-hidden
          data-slot="spinning-wheel"
          className="pointer-events-none absolute aspect-square"
          style={{
            left: wheel.left,
            top: wheel.top,
            height: wheel.height,
            transform: `translate(-50%, -50%) scaleX(${wheel.squash})`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="block size-full animate-spin [animation-direction:reverse] [animation-duration:0.35s] motion-reduce:animate-none"
          >
            <circle cx="12" cy="12" r="11.5" fill="#1f2937" />
            <circle cx="12" cy="12" r="7.5" fill="#cbd5e1" />
            <g stroke="#475569" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 12V5" />
              <path d="M12 12L18.66 9.84" />
              <path d="M12 12L16.11 17.66" />
              <path d="M12 12L7.89 17.66" />
              <path d="M12 12L5.34 9.84" />
            </g>
            <circle cx="12" cy="12" r="1.8" fill="#334155" />
          </svg>
        </span>
      ))}
    </>
  )
}

export { SpinningWheels }
