import { redirect } from 'next/navigation'

export default function SignUpCandidatePage() {
  redirect('/sign-up?workspace=candidate')
}
