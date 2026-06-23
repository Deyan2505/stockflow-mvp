'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Warehouse, MapPin, ArrowRightLeft, BarChart3, Truck, ClipboardList, TrendingDown, ScanLine, ShoppingCart, Users, FileText, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme-toggle'
import { LanguageToggle } from './language-toggle'
import { useT } from '@/lib/i18n'
import { logout } from '@/app/(auth)/actions'

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useT()

  const navigation = [
    { name: t.nav.home,       href: '/',           icon: LayoutDashboard },
    { name: t.nav.products,   href: '/products',   icon: Package         },
    { name: t.nav.warehouses, href: '/warehouses', icon: Warehouse       },
    { name: t.nav.locations,  href: '/locations',  icon: MapPin          },
    { name: t.nav.movements,  href: '/movements',  icon: ArrowRightLeft  },
    { name: t.nav.inventory,  href: '/inventory',  icon: BarChart3       },
    { name: t.nav.scan,       href: '/scan',       icon: ScanLine        },
    { name: t.nav.suppliers,  href: '/suppliers',  icon: Truck           },
    { name: t.nav.customers,  href: '/customers',  icon: Users           },
    { name: t.nav.invoices,   href: '/invoices',   icon: FileText        },
    { name: t.nav.deliveries, href: '/deliveries', icon: ClipboardList   },
    { name: t.nav.orders,     href: '/orders',     icon: ShoppingCart    },
    { name: t.nav.reports,    href: '/reports',    icon: TrendingDown    },
  ]

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-5 dark:border-gray-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
          <ArrowRightLeft className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">StockFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3 dark:border-gray-800">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <LogOut className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
            {t.nav.logout}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between px-3">
          <p className="text-xs text-gray-400 dark:text-gray-600">{t.nav.version}</p>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  )
}
