import { ScanClient } from './scan-client'
import { getCurrentUserContext } from '@/lib/current-user'

export default async function ScanPage() {
  await getCurrentUserContext()
  return <ScanClient />
}
