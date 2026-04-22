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
      viewBox="0 0 100 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 2V22M4 12C12 12 12 2 20 2M4 12C12 12 12 22 20 22"
        stroke={uniColor ? 'currentColor' : 'url(#paint_logo)'}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="32"
        y="18"
        fill="currentColor"
        fontFamily="var(--font-sans), sans-serif"
        fontSize="18"
        fontWeight="800"
        letterSpacing="-0.03em"
      >
        Kyma
      </text>
      <defs>
        <linearGradient
          id="paint_logo"
          x1="4"
          y1="2"
          x2="20"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 2V22M4 12C12 12 12 2 20 2M4 12C12 12 12 22 20 22"
        stroke={uniColor ? 'currentColor' : 'url(#paint_logo)'}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="paint_logo"
          x1="4"
          y1="2"
          x2="20"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
    </svg>
  )
}
