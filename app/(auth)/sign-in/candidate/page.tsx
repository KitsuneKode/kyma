import { redirect } from 'next/navigation'

export default function SignInCandidatePage() {
  redirect('/sign-in?workspace=candidate')
}
