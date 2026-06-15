'use client'

import { useT } from '@/lib/i18n'

export function LanguageToggle() {
  const { lang, toggle } = useT()

  return (
    <button
      onClick={toggle}
      title={lang === 'bg' ? 'Switch to English' : 'Смени на Български'}
      className="flex h-7 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
    >
      {lang === 'bg' ? 'EN' : 'BG'}
    </button>
  )
}
