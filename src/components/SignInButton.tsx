// components/SignInButton.tsx
import Link from "next/link"
export default function SignInButton({className}: {className?: string}) {
    return <Link className={className} href='/auth/email'>Sign In</Link>
}
