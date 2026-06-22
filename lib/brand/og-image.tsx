import { brand } from './site'
import { brandColors } from './colors'
import { KymaMarkSvg } from './mark-svg'

type OgImageProps = {
  title?: string
  description?: string
  eyebrow?: string
}

export function OgImage({
  title = brand.name,
  description = brand.shortDescription,
  eyebrow = 'Voice-first tutor screening',
}: OgImageProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: `radial-gradient(circle at 18% 12%, rgba(16, 185, 129, 0.16), transparent 34%), radial-gradient(circle at 82% 78%, rgba(232, 255, 71, 0.08), transparent 28%), linear-gradient(145deg, ${brandColors.canvas} 0%, #111111 48%, ${brandColors.canvasElevated} 100%)`,
        color: brandColors.foreground,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.35,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          position: 'relative',
        }}
      >
        <KymaMarkSvg width={88} height={78} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: brandColors.accent,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 0.95,
            }}
          >
            {title}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 48,
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: 760,
            fontSize: 34,
            lineHeight: 1.35,
            color: brandColors.muted,
          }}
        >
          {description}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: brandColors.foreground,
            opacity: 0.72,
            whiteSpace: 'nowrap',
          }}
        >
          kyma.kitsunelabs.xyz
        </div>
      </div>
    </div>
  )
}
