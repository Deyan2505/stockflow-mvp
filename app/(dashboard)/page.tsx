import { createAdminClient } from '@/lib/supabase/admin'

const CO = process.env.DEMO_COMPANY_ID!

async function getStats() {
  const sb = createAdminClient()
  const [products, warehouses, locations, movements] = await Promise.all([
    sb.from('products').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('warehouses').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('locations').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('stock_movements').select('id', { count: 'exact', head: true }).eq('company_id', CO),
  ])
  return {
    products: products.count ?? 0,
    warehouses: warehouses.count ?? 0,
    locations: locations.count ?? 0,
    movements: movements.count ?? 0,
  }
}

export default async function DashboardPage() {
  const counts = await getStats()

  const stats = [
    {
      label: 'Продукти',
      value: counts.products > 0 ? String(counts.products) : '—',
      sub: counts.products > 0 ? 'активни продукта' : 'Все още няма продукти',
    },
    {
      label: 'Складове',
      value: counts.warehouses > 0 ? String(counts.warehouses) : '—',
      sub: counts.warehouses > 0 ? 'активни склада' : 'Все още няма складове',
    },
    {
      label: 'Локации',
      value: counts.locations > 0 ? String(counts.locations) : '—',
      sub: counts.locations > 0 ? 'активни локации' : 'Все още няма локации',
    },
    {
      label: 'Движения',
      value: counts.movements > 0 ? String(counts.movements) : '—',
      sub: counts.movements > 0 ? 'записани движения' : 'Все още няма движения',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Начало</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Преглед на наличността
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{stat.sub}</p>
          </div>
        ))}
      </div>

      {counts.products === 0 && counts.warehouses === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
            Започни като добавиш продукти, складове и локации.
          </p>
          <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
            Таблото ще се попълни с данни при записване на движения.
          </p>
        </div>
      )}
    </div>
  )
}
