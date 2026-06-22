import type { CSSProperties } from 'react'
import { brandColors } from './colors'

type MarkSvgProps = {
  width?: number
  height?: number
  style?: CSSProperties
  className?: string
}

export function KymaMarkSvg({
  width = 72,
  height = 64,
  style,
  className,
}: MarkSvgProps) {
  const { mark } = brandColors

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      <path
        d="M 6 6 L 6 26"
        stroke={mark.bar1}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M 12 12 L 12 20"
        stroke={mark.bar2}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M 18 6 L 18 26"
        stroke={mark.bar3}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M 24 10 L 24 22"
        stroke={mark.bar4}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M 30 4 L 30 28"
        stroke={mark.bar5}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const kymaMarkSvgSource = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 36 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 6 6 L 6 26" stroke="#10B981" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 12 12 L 12 20" stroke="#059669" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 18 6 L 18 26" stroke="#34D399" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 24 10 L 24 22" stroke="#10B981" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 30 4 L 30 28" stroke="#059669" stroke-width="4.5" stroke-linecap="round"/>
</svg>`

export const kymaLogoSvgSource = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 6 6 L 6 26" stroke="#10B981" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 12 12 L 12 20" stroke="#059669" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 18 6 L 18 26" stroke="#34D399" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 24 10 L 24 22" stroke="#10B981" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 30 4 L 30 28" stroke="#059669" stroke-width="4.5" stroke-linecap="round"/>
  <text x="42" y="24" fill="#E8E3DA" font-family="Outfit, ui-sans-serif, sans-serif" font-size="24" font-weight="800" letter-spacing="-0.04em">Kyma</text>
</svg>`
