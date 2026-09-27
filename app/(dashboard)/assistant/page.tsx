export const dynamic = 'force-dynamic'

import { getCurrentUserContext } from '@/lib/current-user'
import { AssistantClient } from './assistant-client'

export default async function AssistantPage() {
  // Ensures the user is authenticated — throws and redirects to /login if not
  await getCurrentUserContext()

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <AssistantClient />
    </div>
  )
}
