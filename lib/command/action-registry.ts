export type CommandAction = {
  id: string
  label: string
  href?: string
  action?: 'toggle-theme'
}

export const commandActionRegistry: CommandAction[] = [
  {
    id: 'jump-candidate',
    label: 'Jump to candidate',
    href: '/recruiter/candidates',
  },
  {
    id: 'create-screening',
    label: 'Create screening',
    href: '/recruiter/screenings/new',
  },
  { id: 'open-settings', label: 'Open settings', href: '/recruiter/settings' },
  { id: 'toggle-theme', label: 'Toggle theme', action: 'toggle-theme' },
]
