'use client'

import type { ButtonHTMLAttributes } from 'react'
import Button from '@/components/ui/Button'
import { useFocus } from '@/contexts/FocusContext'

interface CustomProps {
   id?: string
}

export type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> &
   CustomProps

export default function ButtonGraphLink({ id, ...rest }: Props) {
   const { requestFocus } = useFocus()
   return <Button onClick={() => requestFocus(id)} {...rest} />
}
