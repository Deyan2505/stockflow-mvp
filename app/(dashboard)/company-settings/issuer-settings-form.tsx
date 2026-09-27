'use client'

import { useState, useTransition } from 'react'
import {
  saveCompanyInvoiceSettings,
  type CompanyInvoiceSettingsInput,
} from './actions'

const optionalValue = (value: string) => value.trim() || null

export function IssuerSettingsForm({ initial }: { initial: CompanyInvoiceSettingsInput }) {
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (field: keyof CompanyInvoiceSettingsInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setError(null)

    startTransition(async () => {
      const result = await saveCompanyInvoiceSettings({
        legal_name: form.legal_name.trim(),
        address: form.address.trim(),
        eik: form.eik.trim(),
        vat_number: optionalValue(form.vat_number ?? ''),
        mol: form.mol.trim(),
        email: optionalValue(form.email ?? ''),
        phone: optionalValue(form.phone ?? ''),
        bank_name: optionalValue(form.bank_name ?? ''),
        iban: optionalValue(form.iban ?? ''),
        bic: optionalValue(form.bic ?? ''),
      })

      if (!result.success) {
        setError(result.error)
        return
      }
      setMessage('Реквизитите са записани успешно.')
    })
  }

  const fieldClass = 'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white'

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <div className="grid gap-5 rounded-xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Официално наименование <span className="text-red-500">*</span>
          <input required maxLength={300} value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          ЕИК <span className="text-red-500">*</span>
          <input required maxLength={50} value={form.eik} onChange={(e) => set('eik', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200 md:col-span-2">
          Адрес <span className="text-red-500">*</span>
          <input required maxLength={500} value={form.address} onChange={(e) => set('address', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          ДДС номер
          <input maxLength={50} value={form.vat_number ?? ''} onChange={(e) => set('vat_number', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          МОЛ <span className="text-red-500">*</span>
          <input required maxLength={200} value={form.mol} onChange={(e) => set('mol', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Имейл
          <input type="email" maxLength={320} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Телефон
          <input maxLength={100} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Банка
          <input maxLength={200} value={form.bank_name ?? ''} onChange={(e) => set('bank_name', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          IBAN
          <input maxLength={100} value={form.iban ?? ''} onChange={(e) => set('iban', e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          BIC/SWIFT
          <input maxLength={50} value={form.bic ?? ''} onChange={(e) => set('bic', e.target.value)} className={fieldClass} />
        </label>
      </div>

      {error && <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Записване…' : 'Запази реквизитите'}
      </button>
    </form>
  )
}
