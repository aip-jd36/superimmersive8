'use client'

import { Tool } from './AddToolModal'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, FileText } from 'lucide-react'

interface ToolCardProps {
  tool: Tool
  onEdit: (tool: Tool) => void
  onRemove: (toolId: string) => void
}

export default function ToolCard({ tool, onEdit, onRemove }: ToolCardProps) {
  const displayName = tool.toolName === 'Other' ? tool.toolNameOther : tool.toolName

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          {/* Tool Name */}
          <div>
            <h4 className="font-semibold text-gray-900">{displayName}</h4>
            <p className="text-sm text-gray-600">{tool.version}</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-gray-500">Plan:</span>{' '}
              <span className="text-gray-900 font-medium">{tool.planType}</span>
            </div>
            <div>
              <span className="text-gray-500">Receipt:</span>{' '}
              <a
                href={tool.receipt?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                {tool.receipt?.name || 'Uploaded'}
              </a>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Production:</span>{' '}
              <span className="text-gray-900">
                {formatDate(tool.startDate)} - {formatDate(tool.endDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
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
