'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import type { AnchorHTMLAttributes } from 'react'

interface CustomProps {
   id?: string
}

export type Props = AnchorHTMLAttributes<HTMLAnchorElement> & CustomProps

export default function GraphLink({ id, children, ...rest }: Props) {
   const locale = useLocale()
   const base = `/${locale}/canvas`

   return (
      <Link
         href={id ? `${base}?focus=${encodeURIComponent(id)}` : base}
         prefetch={false}
         className="control"
         {...rest}
      >
         {children}
      </Link>
   )
}
