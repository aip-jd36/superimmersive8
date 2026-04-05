'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { DeleteUserButton } from './DeleteUserButton'

export type UserRow = {
  id: string
  email: string
  fullName: string
  createdAt: string   // ISO string
  verified: boolean
  isAdmin: boolean
  submissionCount: number
  totalRevenue: number
}

type SortKey = 'fullName' | 'email' | 'createdAt' | 'verified' | 'submissionCount' | 'totalRevenue'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-gray-600">{dir === 'asc' ? '↑' : '↓'}</span>
}

export function UsersTable({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return users.filter(u =>
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }, [users, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Admins always pin to top regardless of sort
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1

      let cmp = 0
      switch (sortKey) {
        case 'fullName':
          cmp = a.fullName.localeCompare(b.fullName)
          break
        case 'email':
          cmp = a.email.localeCompare(b.email)
          break
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'verified':
          cmp = (a.verified ? 1 : 0) - (b.verified ? 1 : 0)
          break
        case 'submissionCount':
          cmp = a.submissionCount - b.submissionCount
          break
        case 'totalRevenue':
          cmp = a.totalRevenue - b.totalRevenue
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const th = (label: string, key: SortKey) => (
    <th
      className="text-left py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer select-none hover:text-gray-900 whitespace-nowrap"
      onClick={() => handleSort(key)}
    >
      {label}
      <SortIcon active={sortKey === key} dir={sortDir} />
    </th>
  )

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{query ? 'No users match your search.' : 'No users yet.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                {th('Name / Email', 'fullName')}
                {th('Signed Up', 'createdAt')}
                {th('Verified', 'verified')}
                {th('Submissions', 'submissionCount')}
                {th('Total Paid', 'totalRevenue')}
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((user) => {
                const signupDate = new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })

                return (
                  <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">

                    {/* Name / Email */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-sm text-gray-900">{user.fullName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                    </td>

                    {/* Signed up */}
                    <td className="py-4 px-4 text-sm text-gray-600">{signupDate}</td>

                    {/* Verified */}
                    <td className="py-4 px-4">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          ⏳ Pending
                        </span>
                      )}
                    </td>

                    {/* Submissions */}
                    <td className="py-4 px-4">
                      {user.submissionCount > 0 ? (
                        <Link
                          href={`/admin?user=${user.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: '#C8900A' }}
                        >
                          {user.submissionCount} submission{user.submissionCount !== 1 ? 's' : ''}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">None</span>
                      )}
                    </td>

                    {/* Total paid */}
                    <td className="py-4 px-4">
                      {user.totalRevenue > 0 ? (
                        <span className="text-sm font-semibold text-gray-800">
                          ${user.totalRevenue.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">$0</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      {user.isAdmin ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold"
                          style={{ background: '#FEF3C7', color: '#92400E' }}>
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Creator
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4">
                      {!user.isAdmin && (
                        <DeleteUserButton userId={user.id} userEmail={user.email} />
                      )}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
          {query && (
            <p className="text-xs text-gray-400 mt-3 px-1">
              Showing {sorted.length} of {users.length} users
            </p>
          )}
        </div>
      )}
    </>
  )
}
