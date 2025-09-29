'use client'

import type { LiHTMLAttributes } from 'react'
import { useFocus } from '@/contexts/FocusContext'

interface CustomProps {
   id?: string
}

export type Props = Omit<LiHTMLAttributes<HTMLLIElement>, 'onClick'> &
   CustomProps

export default function ButtonGraphLink({ id, ...rest }: Props) {
   const { requestFocus } = useFocus()
   return <li onClick={() => requestFocus(id)} {...rest} />
}
