import { Sidebar } from '@/components/app/sidebar'
import { LanguageProvider } from '@/lib/i18n'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-8">
            {children}
          </div>
        </main>
      </div>
    </LanguageProvider>
  )
}
