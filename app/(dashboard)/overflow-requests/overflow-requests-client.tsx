'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createOverflowRequest, reviewOverflowRequest } from './actions'

export type OverflowRequestRow = {
  id: string
  requested_by: string
  product_id: string
  target_location_id: string
  warehouse_id: string
  buffer_location_id: string
  delivery_id: string | null
  delivery_item_id: string | null
  quantity: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  expires_at: string
  permanent_units: number | null
  buffer_units: number | null
  created_at: string
}

type Location = {
  id: string; code: string; warehouse_id: string; is_buffer: boolean;
  max_capacity_units: number; status: string
}
type DeliveryItem = {
  id: string; product_id: string; remaining: number; delivery_number: string
}
type Props = {
  operatorId: string
  products: { id: string; name: string; unit: string }[]
  locations: Location[]
  occupied: Record<string, number>
  deliveryItems: DeliveryItem[]
  requests: OverflowRequestRow[]
}

export function OverflowRequestsClient({
  operatorId, products, locations, occupied, deliveryItems, requests,
}: Props) {
  const router = useRouter()
  const [productId, setProductId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [deliveryItemId, setDeliveryItemId] = useState('')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const productName = new Map(products.map((p) => [p.id, p.name]))
  const locationName = new Map(locations.map((l) => [l.id, l.code]))

  const submitRequest = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await createOverflowRequest({
        productId, targetLocationId: targetId, quantity: Number(quantity),
        reason, deliveryItemId: deliveryItemId || null,
      })
      if (!result.success) { setError(result.error); return }
      setMessage('Заявката е създадена. Не е приета стока.')
      setReason('')
      router.refresh()
    })
  }

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewId) return
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await reviewOverflowRequest({
          requestId: reviewId, email, password, decision, rejectionReason,
        })
        if (!result.success) { setError(result.error); return }
        setMessage(decision === 'approved'
          ? 'Приемането е одобрено и записано атомарно.'
          : 'Заявката е отказана.')
        setReviewId(null)
        router.refresh()
      } finally {
        setPassword('')
      }
    })
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900'
  const permanent = locations.filter((l) => !l.is_buffer)
  const buffers = locations.filter((l) => l.is_buffer)
  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Извънредно приемане</h1>
      <p className="mt-1 text-sm text-gray-500">
        Операторът заявява приемане при липса на място. Само администратор от същата компания го потвърждава лично.
      </p>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}

    <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
      <h2 className="mb-3 font-semibold">Буферни локации</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {buffers.map((b) => <p key={b.id} className="rounded-lg border p-3 text-sm dark:border-gray-700">
          Буферна локация {b.code}: {occupied[b.id] ?? 0} / {b.max_capacity_units} pcs
        </p>)}
      </div>
    </section>

    <form onSubmit={submitRequest} className="space-y-3 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
      <h2 className="font-semibold">Нова заявка за извънредно приемане</h2>
      <label className="block text-sm">Ред от доставка (незадължително)
        <select className={inputClass} value={deliveryItemId}
          onChange={(e) => {
            setDeliveryItemId(e.target.value)
            const item = deliveryItems.find((i) => i.id === e.target.value)
            if (item) { setProductId(item.product_id); setQuantity(String(item.remaining)) }
          }}>
          <option value="">Ръчно приемане</option>
          {deliveryItems.map((i) => <option key={i.id} value={i.id}>
            {i.delivery_number} — {productName.get(i.product_id) ?? i.product_id} (остават {i.remaining})
          </option>)}
        </select>
      </label>
      <label className="block text-sm">Продукт
        <select required className={inputClass} value={productId}
          onChange={(e) => setProductId(e.target.value)}
          disabled={Boolean(deliveryItemId)}>
          <option value="">Изберете продукт</option>
          {products.filter((p) => p.unit === 'pcs').map((p) =>
            <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">Постоянна целева локация
        <select required className={inputClass} value={targetId}
          onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Изберете локация</option>
          {permanent.map((l) => <option key={l.id} value={l.id}>
            {l.code} — заети {occupied[l.id] ?? 0}/{l.max_capacity_units} pcs
          </option>)}
        </select>
      </label>
      <label className="block text-sm">Общо количество (pcs)
        <input required type="number" min="1" max="2147483647" step="1"
          className={inputClass} value={quantity}
          onChange={(e) => setQuantity(e.target.value)} />
      </label>
      <label className="block text-sm">Причина
        <textarea required minLength={10} maxLength={1000}
          className={inputClass} value={reason}
          onChange={(e) => setReason(e.target.value)} />
      </label>
      <button disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
        Създай заявка
      </button>
    </form>

    <section className="space-y-3">
      <h2 className="font-semibold">Заявки</h2>
      {requests.map((r) => {
        const expired = r.status === 'pending' && new Date(r.expires_at).getTime() <= Date.now()
        return <div key={r.id} className="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-gray-900">
          <p className="font-medium">
            {productName.get(r.product_id) ?? r.product_id} — {r.quantity} pcs →
            {' '}{locationName.get(r.target_location_id) ?? r.target_location_id}
          </p>
          <p className="text-gray-500">
            Статус: {expired ? 'изтекла' :
              r.status === 'pending' ? 'чака одобрение' :
              r.status === 'approved' ? 'одобрена' :
              r.status === 'rejected' ? 'отказана' : 'изтекла'}
            {r.status === 'approved' &&
              ` · постоянна: ${r.permanent_units} pcs · буфер: ${r.buffer_units} pcs`}
          </p>
          <p className="text-gray-500">Причина: {r.reason}</p>
          {r.status === 'pending' && !expired && r.requested_by === operatorId &&
            <button type="button" onClick={() => {
              setReviewId(r.id); setDecision('approved'); setError(null)
            }} className="mt-2 text-sm font-medium text-blue-600">
              Покани администратор за решение
            </button>}
        </div>
      })}
    </section>

    {reviewId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submitReview} className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="font-semibold">Лично администраторско потвърждение</h2>
        <p className="text-sm text-gray-500">
          Въведете имейла и паролата на администратор от същата компания.
          Операторската сесия остава активна.
        </p>
        <label className="block text-sm">Администраторски имейл
          <input required type="email" autoComplete="username"
            className={inputClass} value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm">Администраторска парола
          <input required type="password" autoComplete="current-password"
            className={inputClass} value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="block text-sm">Решение
          <select className={inputClass} value={decision}
            onChange={(e) => setDecision(e.target.value as 'approved' | 'rejected')}>
            <option value="approved">Одобри</option>
            <option value="rejected">Откажи</option>
          </select>
        </label>
        {decision === 'rejected' && <label className="block text-sm">Причина за отказ
          <textarea required minLength={10} className={inputClass}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)} />
        </label>}
        <div className="flex gap-3">
          <button disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            Потвърди
          </button>
          <button type="button" onClick={() => { setReviewId(null); setPassword('') }}
            className="rounded-lg border px-4 py-2 text-sm">Отказ</button>
        </div>
      </form>
    </div>}
  </div>
}
