// src/app/[locale]/faq/auth-make-account/page.tsx
'use client'

import { useLocale, useTranslations } from 'use-intl'
import Link from 'next/link'
import cls from './page.module.css'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import ThemeToggleButton from '@/components/ThemeToggleButton'
import SignInButton from '@/components/SignInButton'
import { cap } from '@/lib/utils'
import UtilityHeader from '@/components/UtilityHeader'

export default function FaqAuthMakeAccountPage() {
   const t = useTranslations('faqAuth')
   const locale = useLocale()

   return (
      <article className="article">
         <UtilityHeader title={cap(t('title'))} />

         <div className="body">
            <SignInButton variant="outline" tone="blue" />

            <section className={cls.section}>
               <h2 className={cls.h2}>{t('flow.title')}</h2>
               <p className={cls.lead}>{t('flow.intro')}</p>

               <ol className={cls.steps}>
                  <li>{t('flow.steps.0')}</li>
                  <li>{t('flow.steps.1')}</li>
                  <li>{t('flow.steps.2')}</li>
                  <li>{t('flow.steps.3')}</li>
               </ol>

               <p className={cls.note}>{t('flow.note')}</p>
            </section>

            <section className={cls.section}>
               <h2 className={cls.h2}>{t('roles.title')}</h2>

               <ul className={cls.roles}>
                  <li className={cls.roleItem}>
                     <span
                        className="control"
                        data-variant="outline"
                        data-size="s"
                        data-tone="purple"
                     >
                        {t('roles.admin.name')}
                     </span>
                     <p className={cls.roleDesc}>{t('roles.admin.desc')}</p>
                  </li>
                  <li className={cls.roleItem}>
                     <span
                        className="control"
                        data-size="s"
                        data-tone="blue"
                        data-variant="outline"
                     >
                        {t('roles.member.name')}
                     </span>
                     <p className={cls.roleDesc}>{t('roles.member.desc')}</p>
                  </li>
                  <li className={cls.roleItem}>
                     <span
                        className="control"
                        data-variant="outline"
                        data-size="s"
                        data-tone="gray"
                     >
                        {t('roles.anon.name')}
                     </span>
                     <p className={cls.roleDesc}>{t('roles.anon.desc')}</p>
                  </li>
               </ul>
            </section>

            <section className={cls.section}>
               <h2 className={cls.h2}>{t('faq.title')}</h2>

               <details className={cls.faqItem}>
                  <summary
                     data-variant="soft"
                     className={`control ${cls.faqSummary}`}
                  >
                     {t('faq.q1')}
                  </summary>
                  <p className={cls.faqBody}>{t('faq.a1')}</p>
               </details>

               <details className={cls.faqItem}>
                  <summary
                     data-variant="soft"
                     className={`control ${cls.faqSummary}`}
                  >
                     {t('faq.q2')}
                  </summary>
                  <p className={cls.faqBody}>{t('faq.a2')}</p>
               </details>

               <p className={cls.contact}>
                  {t.rich('faq.contact', {
                     link: (chunks) => (
                        <Link href={`/${locale}/contact`} className={cls.link}>
                           {chunks}
                        </Link>
                     ),
                  })}
               </p>
            </section>
         </div>
      </article>
   )
}
