import { UI_Size, UI_Variant, UI_Tone } from '@/types'
import * as React from 'react'

export type ButtonProps = Omit<
   React.ButtonHTMLAttributes<HTMLButtonElement>,
   'className'
> & {
   size?: UI_Size
   variant?: UI_Variant
   tone?: UI_Tone
}

export default function Button({
   size = 'm',
   variant,
   tone,
   type = 'button',
   ...rest
}: ButtonProps) {
   return (
      <button
         {...rest}
         type={type}
         className="control"
         data-size={size}
         data-variant={variant}
         data-tone={tone}
      />
   )
}
