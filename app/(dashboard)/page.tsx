const stats = [
  { label: 'Продукти', value: '—', sub: 'Все още няма продукти' },
  { label: 'Складове', value: '—', sub: 'Все още няма складове' },
  { label: 'Локации', value: '—', sub: 'Все още няма локации' },
  { label: 'Движения', value: '—', sub: 'Все още няма движения' },
]

export default function DashboardPage() {
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

      <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
          Започни като добавиш продукти, складове и локации.
        </p>
        <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
          Таблото ще се попълни с данни при записване на движения.
        </p>
      </div>
    </div>
  )
}
