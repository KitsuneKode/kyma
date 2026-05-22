import { redirect } from 'next/navigation'

export default function SignUpRecruiterPage() {
  redirect('/sign-up?workspace=recruiter')
}
