'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthenticatedPermission } from '@/lib/current-user'
import { createClient } from '@/lib/supabase/server'

export type CompanyInvoiceSettingsInput = {
  legal_name: string
  address: string
  eik: string
  vat_number: string | null
  mol: string
  email: string | null
  phone: string | null
  bank_name: string | null
  iban: string | null
  bic: string | null
}

export type CompanyInvoiceSettingsResult =
  | { success: true }
  | { success: false; error: string }

export async function saveCompanyInvoiceSettings(
  input: CompanyInvoiceSettingsInput
): Promise<CompanyInvoiceSettingsResult> {
  try {
    await requireAuthenticatedPermission('manage_company_settings')

    if (!input.legal_name.trim() || !input.address.trim() || !input.eik.trim() || !input.mol.trim()) {
      return { success: false, error: 'Попълнете всички задължителни полета.' }
    }

    const sb = await createClient()
    const { error } = await sb.rpc('save_company_invoice_settings', {
      p_legal_name: input.legal_name,
      p_address: input.address,
      p_eik: input.eik,
      p_vat_number: input.vat_number,
      p_mol: input.mol,
      p_email: input.email,
      p_phone: input.phone,
      p_bank_name: input.bank_name,
      p_iban: input.iban,
      p_bic: input.bic,
    })

    if (error) {
      if (error.message.includes('ISSUER_SETTINGS_REQUIRED_FIELDS')) {
        return { success: false, error: 'Попълнете всички задължителни полета.' }
      }
      if (error.message.includes('ISSUER_SETTINGS_FIELD_TOO_LONG')) {
        return { success: false, error: 'Едно или повече полета са прекалено дълги.' }
      }
      return { success: false, error: 'Реквизитите не можаха да бъдат записани.' }
    }

    revalidatePath('/company-settings')
    revalidatePath('/invoices')
    return { success: true }
  } catch {
    return { success: false, error: 'Нямате право да променяте фирмените реквизити.' }
  }
}
