// CATALOG DISABLED: Showcase/Catalog feature is not active in this phase.
// Original implementation preserved in git history (commit before catalog refactor).
// Reactivate by restoring this file and re-enabling related routes.

import { requireAdmin } from '@/lib/auth/admin'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function CatalogManagementPage() {
  await requireAdmin()

  return (
    <div>
      <div className="bg-white border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Catalog Management</h1>
          <p className="text-gray-500 mt-2">Showcase/Catalog is not active in this phase. Focus is on SI8 Certified assessments.</p>
        </div>
      </div>
    </div>
  )
}
