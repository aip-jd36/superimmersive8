'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Props = {
  entryId: string
  currentVisibility: boolean
}

export function ToggleVisibilityButton({ entryId, currentVisibility }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    const action = currentVisibility ? 'hide' : 'show'
    if (!confirm(`${action === 'hide' ? 'Hide' : 'Show'} this entry in the public catalog?`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/catalog/${entryId}/toggle-visibility`, {
        method: 'POST',
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to toggle visibility'}`)
      }
    } catch (error) {
      console.error('Error toggling visibility:', error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleToggle}
      disabled={loading}
      className={currentVisibility ? 'border-orange-300 text-orange-700' : 'border-green-300 text-green-700'}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : currentVisibility ? (
        <>
          <EyeOff className="w-4 h-4 mr-1" />
          Hide
        </>
      ) : (
        <>
          <Eye className="w-4 h-4 mr-1" />
          Show
        </>
      )}
    </Button>
  )
}
