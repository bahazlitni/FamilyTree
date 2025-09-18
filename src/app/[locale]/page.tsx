import GraphLink from '@/components/GraphLink'
import { cap } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export default function Page() {
   const g = useTranslations('globals')

   return <GraphLink id="P:21">{cap(g('click-me'))}!</GraphLink>
}
