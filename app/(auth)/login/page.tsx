'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Грешен имейл или парола. Моля, опитайте отново.')
      setIsPending(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <ArrowRightLeft className="h-5 w-5 text-white" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">StockFlow</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Складова програма</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-7 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-6 text-base font-semibold text-gray-900 dark:text-white">
            Вход в системата
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Имейл
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Парола
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Влизане…' : 'Вход'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
