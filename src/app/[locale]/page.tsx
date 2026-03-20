import ButtonGraphLink from '@/components/GraphLink/ButtonGraphLink'
import { cap } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export default function Page() {
   const g = useTranslations('globals')

   return (
      <main
         style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
         }}
      >
         <ButtonGraphLink id="P:21">{cap(g('click-me'))}!</ButtonGraphLink>
      </main>
   )
}
