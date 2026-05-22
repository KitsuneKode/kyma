import { redirect } from 'next/navigation'

export default function SignInRecruiterPage() {
  redirect('/sign-in?workspace=recruiter')
}
