export const kymaClerkAppearance = {
  variables: {
    colorBackground: 'var(--card)',
    colorText: 'var(--foreground)',
    colorInputBackground: 'var(--background)',
    colorInputText: 'var(--foreground)',
    colorPrimary: 'var(--primary)',
    colorTextOnPrimaryBackground: 'var(--primary-foreground)',
    colorDanger: 'var(--destructive)',
    colorSuccess: 'var(--chart-1)',
    colorMuted: 'var(--muted)',
    colorMutedForeground: 'var(--muted-foreground)',
    colorNeutral: 'var(--border)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-sans)',
    fontFamilyButtons: 'var(--font-sans)',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent p-0',
    headerTitle: 'text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButton:
      'border border-border/60 bg-background text-foreground',
    formFieldInput:
      'rounded-xl border border-border/60 bg-background text-foreground',
    formButtonPrimary:
      'rounded-xl bg-primary text-primary-foreground hover:bg-primary/90',
    footer: 'hidden',
    footerAction: 'hidden',
    identityPreview: 'border border-border/60 bg-muted/20',
    organizationPreview: 'border border-border/60 bg-muted/20',
  },
}
