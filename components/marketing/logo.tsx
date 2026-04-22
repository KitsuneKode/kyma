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
      <g>
        <path
          d="M 6 6 L 6 26"
          stroke={uniColor ? 'currentColor' : 'url(#logo_p1)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 12 12 L 12 20"
          stroke={uniColor ? 'currentColor' : 'url(#logo_p2)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 18 6 L 18 26"
          stroke={uniColor ? 'currentColor' : 'url(#logo_p3)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 24 10 L 24 22"
          stroke={uniColor ? 'currentColor' : 'url(#logo_p4)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 30 4 L 30 28"
          stroke={uniColor ? 'currentColor' : 'url(#logo_p5)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
      <text
        x="42"
        y="24"
        fill="currentColor"
        fontFamily="var(--font-sans), sans-serif"
        fontSize="24"
        fontWeight="800"
        letterSpacing="-0.04em"
      >
        Kyma
      </text>
      <defs>
        <linearGradient
          id="logo_p1"
          x1="6"
          y1="6"
          x2="6"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id="logo_p2"
          x1="12"
          y1="12"
          x2="12"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient
          id="logo_p3"
          x1="18"
          y1="6"
          x2="18"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient
          id="logo_p4"
          x1="24"
          y1="10"
          x2="24"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id="logo_p5"
          x1="30"
          y1="4"
          x2="30"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#022C22" />
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
      viewBox="0 0 36 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          d="M 6 6 L 6 26"
          stroke={uniColor ? 'currentColor' : 'url(#logo_i_p1)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 12 12 L 12 20"
          stroke={uniColor ? 'currentColor' : 'url(#logo_i_p2)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 18 6 L 18 26"
          stroke={uniColor ? 'currentColor' : 'url(#logo_i_p3)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 24 10 L 24 22"
          stroke={uniColor ? 'currentColor' : 'url(#logo_i_p4)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 30 4 L 30 28"
          stroke={uniColor ? 'currentColor' : 'url(#logo_i_p5)'}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <linearGradient
          id="logo_i_p1"
          x1="6"
          y1="6"
          x2="6"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id="logo_i_p2"
          x1="12"
          y1="12"
          x2="12"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient
          id="logo_i_p3"
          x1="18"
          y1="6"
          x2="18"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient
          id="logo_i_p4"
          x1="24"
          y1="10"
          x2="24"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id="logo_i_p5"
          x1="30"
          y1="4"
          x2="30"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#022C22" />
        </linearGradient>
      </defs>
    </svg>
  )
}
