export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { requireAuthenticatedPermission } from '@/lib/current-user'
import { createClient } from '@/lib/supabase/server'
import { IssuerSettingsForm } from './issuer-settings-form'
import type { CompanyInvoiceSettingsInput } from './actions'

const EMPTY_SETTINGS: CompanyInvoiceSettingsInput = {
  legal_name: '',
  address: '',
  eik: '',
  vat_number: null,
  mol: '',
  email: null,
  phone: null,
  bank_name: null,
  iban: null,
  bic: null,
}

export default async function CompanySettingsPage() {
  const { companyId } = await requireAuthenticatedPermission('manage_company_settings')
  const sb = await createClient()
  const { data, error } = await sb
    .from('company_invoice_settings')
    .select('legal_name, address, eik, vat_number, mol, email, phone, bank_name, iban, bic')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) throw new Error('Фирмените реквизити не могат да бъдат заредени.')

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Реквизити за фактури</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            При издаване тези данни се записват като неизменяем snapshot към конкретната фактура.
          </p>
        </div>
        <Link href="/invoices" className="text-sm text-blue-600 hover:underline">
          ← Към фактури
        </Link>
      </div>

      <IssuerSettingsForm initial={(data ?? EMPTY_SETTINGS) as CompanyInvoiceSettingsInput} />
    </div>
  )
}
