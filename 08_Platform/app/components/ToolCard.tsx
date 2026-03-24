'use client'

import { Tool } from './AddToolModal'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, FileText, Star } from 'lucide-react'

interface ToolCardProps {
  tool: Tool
  onEdit: (tool: Tool) => void
  onRemove: (toolId: string) => void
}

export default function ToolCard({ tool, onEdit, onRemove }: ToolCardProps) {
  const displayName = tool.toolName === 'Other' ? tool.toolNameOther : tool.toolName

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className={`border rounded-lg p-4 shadow-sm transition-shadow hover:shadow-md ${
      tool.isPrimary
        ? 'bg-amber-50 border-amber-300'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">

          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{displayName}</h4>
            {tool.isPrimary && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                <Star className="h-3 w-3 fill-amber-600 text-amber-600" />
                PRIMARY
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600">{tool.version}</p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-gray-500">Plan:</span>{' '}
              <span className="text-gray-900 font-medium">{tool.planType}</span>
            </div>
            <div>
              <span className="text-gray-500">Receipt:</span>{' '}
              {tool.receipt ? (
                <a
                  href={tool.receipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  {tool.receipt.name || 'View'}
                </a>
              ) : (
                <span className="text-gray-400 italic">Not uploaded</span>
              )}
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Production:</span>{' '}
              <span className="text-gray-900">
                {formatDate(tool.startDate)} – {formatDate(tool.endDate)}
              </span>
            </div>
          </div>

        </div>

        <div className="flex gap-2 ml-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(tool)}
            className="text-gray-600 hover:text-primary"
            title="Edit tool"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(tool.id)}
            className="text-gray-600 hover:text-red-600"
            title="Remove tool"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
