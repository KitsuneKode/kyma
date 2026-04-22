import { cn } from '@/lib/utils'

export const Logo = ({
  className,
  uniColor,
}: {
  className?: string
  uniColor?: boolean
}) => {
  return (
    <svg
      className={cn('h-6 w-auto text-foreground', className)}
      viewBox="0 0 120 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 4V28"
        stroke={uniColor ? 'currentColor' : 'url(#logo_paint1)'}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M26 4L14 16L26 28"
        stroke={uniColor ? 'currentColor' : 'url(#logo_paint2)'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="23"
        cy="16"
        r="3"
        fill={uniColor ? 'currentColor' : 'url(#logo_paint3)'}
      />
      <text
        x="38"
        y="24"
        fill="currentColor"
        fontFamily="var(--font-sans), sans-serif"
        fontSize="24"
        fontWeight="800"
        letterSpacing="-0.03em"
      >
        Kyma
      </text>
      <defs>
        <linearGradient
          id="logo_paint1"
          x1="5"
          y1="4"
          x2="5"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id="logo_paint2"
          x1="14"
          y1="4"
          x2="26"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#06B6D4" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient
          id="logo_paint3"
          x1="20"
          y1="13"
          x2="26"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D946EF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export const LogoIcon = ({
  className,
  uniColor,
}: {
  className?: string
  uniColor?: boolean
}) => {
  return (
    <svg
      className={cn('size-6', className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 4V28"
        stroke={uniColor ? 'currentColor' : 'url(#logo_icon_paint1)'}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M26 4L14 16L26 28"
        stroke={uniColor ? 'currentColor' : 'url(#logo_icon_paint2)'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="23"
        cy="16"
        r="3"
        fill={uniColor ? 'currentColor' : 'url(#logo_icon_paint3)'}
      />
      <defs>
        <linearGradient
          id="logo_icon_paint1"
          x1="5"
          y1="4"
          x2="5"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id="logo_icon_paint2"
          x1="14"
          y1="4"
          x2="26"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#06B6D4" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient
          id="logo_icon_paint3"
          x1="20"
          y1="13"
          x2="26"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D946EF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  )
}
