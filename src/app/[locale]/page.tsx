import ButtonGraphLink from '@/components/GraphLink/ButtonGraphLink'
import { cap } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export default function Page() {
   const g = useTranslations('globals')

   return <ButtonGraphLink id="P:21">{cap(g('click-me'))}!</ButtonGraphLink>
}
