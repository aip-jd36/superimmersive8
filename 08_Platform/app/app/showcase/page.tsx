'use client'

import { useState, useEffect } from 'react'
import { X, Play, Search, Clock, User, CheckCircle, ArrowRight, Mail, FileText } from 'lucide-react'
import Link from 'next/link'

type CatalogEntry = {
  id: string
  catalog_id: string
  video_url: string
  thumbnail_url: string | null
  public_description: string | null
  submission: {
    title: string
    genre: string | null
    filmmaker_name: string
    runtime: number | null
    tier: string | null
  }
}

function getEmbedUrl(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = ''
    if (url.includes('youtube.com/watch')) {
      videoId = new URL(url).searchParams.get('v') || ''
    } else if (url.includes('youtube.com/shorts/')) {
      videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0] || ''
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`
  }
  if (url.includes('vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0] || ''
    return `https://player.vimeo.com/video/${videoId}?autoplay=1`
  }
  return url
}

function getYouTubeThumbnail(videoUrl: string): string | null {
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    let videoId = ''
    if (videoUrl.includes('youtube.com/watch')) {
      try { videoId = new URL(videoUrl).searchParams.get('v') || '' } catch { return null }
    } else if (videoUrl.includes('youtube.com/shorts/')) {
      videoId = videoUrl.split('youtube.com/shorts/')[1]?.split('?')[0] || ''
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    if (videoId) return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
  return null
}

function getThumbnailUrl(videoUrl: string, providedThumbnail: string | null): string {
  if (providedThumbnail) return providedThumbnail
  const ytThumb = getYouTubeThumbnail(videoUrl)
  if (ytThumb) return ytThumb
  return 'https://placehold.co/1280x720/1a1a1a/ffffff?text=Video'
}

function formatRuntime(seconds: number | null): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ShowcasePage() {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<CatalogEntry | null>(null)
  const [licenseVideo, setLicenseVideo] = useState<CatalogEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')

  // License form state
  const [licenseName, setLicenseName] = useState('')
  const [licenseEmail, setLicenseEmail] = useState('')
  const [licenseMessage, setLicenseMessage] = useState('')
  const [licenseSubmitting, setLicenseSubmitting] = useState(false)
  const [licenseSuccess, setLicenseSuccess] = useState(false)
  const [licenseError, setLicenseError] = useState('')
  const [rightsVerifiedOpen, setRightsVerifiedOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => { fetchCatalog() }, [])
  useEffect(() => { filterEntries() }, [entries, searchQuery, selectedGenre])

  const fetchCatalog = async () => {
    try {
      const response = await fetch('/api/catalog')
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Error fetching catalog:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEntries = () => {
    let filtered = entries
    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.submission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.submission.filmmaker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.public_description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(entry => entry.submission.genre === selectedGenre)
    }
    setFilteredEntries(filtered)
  }

  const openLicenseForm = (entry: CatalogEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    setLicenseVideo(entry)
    setLicenseName('')
    setLicenseEmail('')
    setLicenseMessage('')
    setLicenseSuccess(false)
    setLicenseError('')
  }

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseVideo) return
    setLicenseSubmitting(true)
    setLicenseError('')
    try {
      const res = await fetch('/api/license-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filmTitle: licenseVideo.submission.title,
          catalogId: licenseVideo.catalog_id || '',
          inquirerName: licenseName,
          inquirerEmail: licenseEmail,
          message: licenseMessage,
        }),
      })
      if (res.ok) {
        setLicenseSuccess(true)
      } else {
        setLicenseError('Something went wrong. Please email jd@superimmersive8.com directly.')
      }
    } catch {
      setLicenseError('Something went wrong. Please email jd@superimmersive8.com directly.')
    } finally {
      setLicenseSubmitting(false)
    }
  }

  const genres: string[] = ['all', ...Array.from(new Set(entries.map(e => e.submission.genre).filter((g): g is string => g !== null)))]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #333', zIndex: 100 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
          <Link href="https://superimmersive8.com" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', textDecoration: 'none' }}>
            SuperImmersive <span style={{ color: '#f59e0b' }}>8</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            <Link href="https://superimmersive8.com/how-it-works" style={{ color: '#a0a0a0', textDecoration: 'none', fontSize: '0.95rem' }}>How It Works</Link>
            <Link href="https://superimmersive8.com/pricing" style={{ color: '#a0a0a0', textDecoration: 'none', fontSize: '0.95rem' }}>Pricing</Link>
            <span style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 500 }}>Showcase</span>

            {/* Rights Verified dropdown */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setRightsVerifiedOpen(true)}
              onMouseLeave={() => setRightsVerifiedOpen(false)}
            >
              <button style={{ background: 'none', border: 'none', color: '#a0a0a0', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                Rights Verified <span style={{ fontSize: '0.65rem' }}>▼</span>
              </button>
              {rightsVerifiedOpen && (
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '0.5rem 0', minWidth: '200px', marginTop: '8px' }}>
                  <a href="https://superimmersive8.com/rights-verified" style={{ display: 'block', padding: '0.5rem 1rem', color: '#a0a0a0', textDecoration: 'none', fontSize: '0.9rem' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#a0a0a0')}>Overview</a>
                  <a href="https://superimmersive8.com/rights-verified/playbook" style={{ display: 'block', padding: '0.5rem 1rem', color: '#a0a0a0', textDecoration: 'none', fontSize: '0.9rem' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#a0a0a0')}>Full Playbook</a>
                  <a href="https://superimmersive8.com/rights-verified/chain-of-title" style={{ display: 'block', padding: '0.5rem 1rem', color: '#a0a0a0', textDecoration: 'none', fontSize: '0.9rem' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#a0a0a0')}>Chain of Title</a>
                </div>
              )}
            </div>

            {/* Login dropdown */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setLoginOpen(true)}
              onMouseLeave={() => setLoginOpen(false)}
            >
              <button style={{ background: 'none', border: 'none', color: '#a0a0a0', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                Login <span style={{ fontSize: '0.65rem' }}>▼</span>
              </button>
              {loginOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '0.5rem 0', minWidth: '160px', marginTop: '8px' }}>
                  <Link href="/auth/login" style={{ display: 'block', padding: '0.5rem 1rem', color: '#a0a0a0', textDecoration: 'none', fontSize: '0.9rem' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#a0a0a0')}>Creator Login</Link>
                  <Link href="/auth/login" style={{ display: 'block', padding: '0.5rem 1rem', color: '#a0a0a0', textDecoration: 'none', fontSize: '0.9rem' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#a0a0a0')}>Admin Login</Link>
                </div>
              )}
            </div>

            <Link href="/auth/signup" style={{ backgroundColor: '#f59e0b', color: '#000000', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
              Get Verified
            </Link>

            {/* EN / ZH toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>EN</span>
              <span style={{ color: '#555' }}>/</span>
              <a href="https://superimmersive8.com/zh" style={{ color: '#a0a0a0', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#a0a0a0')}>繁體中文</a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid #222', padding: '4rem 2rem 3rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '999px', padding: '4px 14px', marginBottom: '1rem' }}>
                <CheckCircle style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', letterSpacing: '0.05em' }}>SI8 VERIFIED SHOWCASE</span>
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
                AI Films Available for Licensing.
              </h1>
              <p style={{ color: '#a0a0a0', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '560px' }}>
                SI8 Certified works have passed a 90-minute rights review and hold a signed Chain of Title document — cleared for commercial use. Creator Records are self-attested with documentation on file, available for preview and licensing discussion.
              </p>
            </div>
            {!loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '999px', padding: '0.5rem 1.125rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#a0a0a0' }}>{entries.length} Available for Licensing</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#555', textAlign: 'right' }}>
                  Watch, then request a license
                </p>
              </div>
            )}
          </div>

          {/* Search + filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#666' }} />
              <input
                type="text"
                placeholder="Search by title, filmmaker, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#ffffff', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              style={{ padding: '0.75rem 1rem', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#ffffff', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre === 'all' ? 'All Genres' : genre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Video Grid ── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{ width: '40px', height: '40px', border: '2px solid #333', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: '#666' }}>Loading Showcase...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Search style={{ width: '28px', height: '28px', color: '#666' }} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {searchQuery || selectedGenre !== 'all' ? 'No results found' : 'No entries yet'}
            </h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              {searchQuery || selectedGenre !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Verified works will appear here once filmmakers opt in.'}
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Showing <strong style={{ color: '#ffffff' }}>{filteredEntries.length}</strong> verified {filteredEntries.length === 1 ? 'work' : 'works'} available for licensing
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #282828', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f59e0b'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#282828'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  {/* Thumbnail — clickable to watch */}
                  <div
                    onClick={() => setSelectedVideo(entry)}
                    style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#111', overflow: 'hidden', cursor: 'pointer' }}
                  >
                    <img
                      src={getThumbnailUrl(entry.video_url, entry.thumbnail_url)}
                      alt={entry.submission.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        const img = e.currentTarget
                        const ytThumb = getYouTubeThumbnail(entry.video_url)
                        if (ytThumb && img.src !== ytThumb) {
                          img.src = ytThumb
                        } else {
                          img.src = 'https://placehold.co/1280x720/1a1a1a/555555?text=Preview+Unavailable'
                        }
                      }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />

                    {/* Tier badge */}
                    {(entry.submission as any).tier === 'creator_record' ? (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(0,0,0,0.75)', color: '#a0a0a0', fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', letterSpacing: '0.05em', border: '1px solid #555' }}>
                        <FileText style={{ width: '10px', height: '10px' }} />
                        CREATOR RECORD
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(245,158,11,0.92)', color: '#000000', fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', letterSpacing: '0.05em' }}>
                        <CheckCircle style={{ width: '10px', height: '10px' }} />
                        SI8 CERTIFIED
                      </div>
                    )}

                    {/* Play overlay */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0)', transition: 'background-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.4)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0)'}
                    >
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play style={{ width: '24px', height: '24px', color: '#111', marginLeft: '3px' }} fill="currentColor" />
                      </div>
                    </div>

                    {/* Catalog ID */}
                    {entry.catalog_id && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.8)', color: '#a0a0a0', fontSize: '0.7rem', fontFamily: 'monospace', padding: '4px 10px', borderRadius: '999px', border: '1px solid #333' }}>
                        {entry.catalog_id}
                      </div>
                    )}

                    {/* Runtime */}
                    {entry.submission.runtime && (
                      <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.8)', color: '#a0a0a0', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock style={{ width: '11px', height: '11px' }} />
                        {formatRuntime(entry.submission.runtime)}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                      {entry.submission.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      <User style={{ width: '14px', height: '14px' }} />
                      <span>{entry.submission.filmmaker_name}</span>
                    </div>
                    {entry.submission.genre && (
                      <span style={{ display: 'inline-block', backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', marginBottom: '0.75rem' }}>
                        {entry.submission.genre}
                      </span>
                    )}
                    {entry.public_description && (
                      <p style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {entry.public_description}
                      </p>
                    )}

                    {/* Two action buttons */}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #282828', display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setSelectedVideo(entry)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: 'transparent', border: '1px solid #333', borderRadius: '6px', color: '#a0a0a0', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#555'; (e.currentTarget as HTMLElement).style.color = '#ffffff' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#333'; (e.currentTarget as HTMLElement).style.color = '#a0a0a0' }}
                      >
                        <Play style={{ width: '13px', height: '13px' }} />
                        Watch
                      </button>
                      <button
                        onClick={(e) => openLicenseForm(entry, e)}
                        style={{ flex: 1, padding: '0.5rem', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: '#f59e0b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,158,11,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = '#f59e0b' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,158,11,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.3)' }}
                      >
                        <Mail style={{ width: '13px', height: '13px' }} />
                        Request License
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Creator CTA Section ── */}
      <div style={{ borderTop: '1px solid #1f1f1f', backgroundColor: '#0a0a0a', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: '999px', padding: '4px 14px', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#a0a0a0', letterSpacing: '0.05em' }}>FOR AI FILMMAKERS</span>
          </div>

          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.2 }}>
            Is your AI film in the Showcase?
          </h2>

          <p style={{ color: '#a0a0a0', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '640px', margin: '0 auto 2.5rem' }}>
            Get your film verified first — then opt in to the Showcase. When brands license your work through SI8, you keep <strong style={{ color: '#ffffff' }}>80% of the licensing fee</strong>. We handle the negotiation, contracts, and payment.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '700px', margin: '0 auto 3rem', textAlign: 'left' }}>
            {[
              { range: 'Digital & Social', earn: 'You earn $400–$1,600' },
              { range: 'Broadcast & Campaign', earn: 'You earn $1,600–$6,400' },
              { range: 'Category-Exclusive', earn: 'You earn $6,400–$16,000' },
              { range: 'Full Buyout', earn: 'You earn $16,000+' },
            ].map(({ range, earn }) => (
              <div key={range} style={{ backgroundColor: '#1a1a1a', border: '1px solid #282828', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.4rem' }}>{range}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f59e0b' }}>{earn}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/auth/signup"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#f59e0b', color: '#000000', padding: '0.875rem 2rem', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Get Your Film Verified
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </a>
            <a
              href="https://superimmersive8.com/pricing"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'transparent', color: '#ffffff', padding: '0.875rem 2rem', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', border: '1px solid #444' }}
            >
              See Pricing
            </a>
          </div>

          <p style={{ color: '#555', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            Verification from $29 (Creator Record) · Showcase listing is opt-in after approval · No upfront listing fee
          </p>
        </div>
      </div>

      {/* ── Watch Modal ── */}
      {selectedVideo && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #282828' }}>
              <div>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {selectedVideo.submission.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#a0a0a0' }}>
                  <span>{selectedVideo.submission.filmmaker_name}</span>
                  {selectedVideo.catalog_id && (
                    <span style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{selectedVideo.catalog_id}</span>
                  )}
                  {selectedVideo.submission.tier === 'si8_certified' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: 600, fontSize: '0.75rem' }}>
                      <CheckCircle style={{ width: '12px', height: '12px' }} />
                      SI8 CERTIFIED
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a0a0a0', fontWeight: 600, fontSize: '0.75rem' }}>
                      <FileText style={{ width: '12px', height: '12px' }} />
                      CREATOR RECORD
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#252525', border: '1px solid #333', color: '#a0a0a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
              <iframe
                src={getEmbedUrl(selectedVideo.video_url)}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #282828', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                {selectedVideo.submission.genre && (
                  <span style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 500, padding: '4px 12px', borderRadius: '999px' }}>
                    {selectedVideo.submission.genre}
                  </span>
                )}
                {selectedVideo.submission.runtime && (
                  <span style={{ backgroundColor: '#252525', color: '#a0a0a0', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock style={{ width: '13px', height: '13px' }} />
                    {formatRuntime(selectedVideo.submission.runtime)}
                  </span>
                )}
                {selectedVideo.public_description && (
                  <p style={{ width: '100%', color: '#a0a0a0', fontSize: '0.875rem', lineHeight: 1.6, margin: '0.25rem 0 0' }}>
                    {selectedVideo.public_description}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => { setSelectedVideo(null); openLicenseForm(selectedVideo, e) }}
                style={{ backgroundColor: '#f59e0b', color: '#000000', padding: '0.625rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Request License
                <ArrowRight style={{ width: '15px', height: '15px' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── License Request Modal ── */}
      {licenseVideo && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
          onClick={() => setLicenseVideo(null)}
        >
          <div
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', maxWidth: '520px', width: '100%', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #282828' }}>
              <div>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  Request a License
                </h2>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>We&apos;ll get back to you within 1 business day.</p>
              </div>
              <button
                onClick={() => setLicenseVideo(null)}
                style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#252525', border: '1px solid #333', color: '#a0a0a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {licenseSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <CheckCircle style={{ width: '28px', height: '28px', color: '#22c55e' }} />
                  </div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Inquiry received!</h3>
                  <p style={{ color: '#a0a0a0', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    We&apos;ll be in touch about <strong style={{ color: '#ffffff' }}>{licenseVideo.submission.title}</strong> within 1 business day.
                  </p>
                  <button
                    onClick={() => setLicenseVideo(null)}
                    style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', backgroundColor: '#252525', border: '1px solid #333', borderRadius: '6px', color: '#a0a0a0', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLicenseSubmit}>
                  {/* Film title — read-only */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#a0a0a0', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                      REQUESTED TITLE TO LICENSE
                    </label>
                    <input
                      type="text"
                      value={`${licenseVideo.submission.title}${licenseVideo.catalog_id ? ` (${licenseVideo.catalog_id})` : ''}`}
                      readOnly
                      style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: '#111', border: '1px solid #282828', borderRadius: '6px', color: '#666', fontSize: '0.9rem', cursor: 'default' }}
                    />
                  </div>

                  {/* Name + Email — 2 columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#a0a0a0', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                        YOUR NAME <span style={{ color: '#f59e0b' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={licenseName}
                        onChange={(e) => setLicenseName(e.target.value)}
                        placeholder="Jane Smith"
                        style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#a0a0a0', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                        EMAIL <span style={{ color: '#f59e0b' }}>*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={licenseEmail}
                        onChange={(e) => setLicenseEmail(e.target.value)}
                        placeholder="jane@company.com"
                        style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Comments */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#a0a0a0', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                      COMMENTS
                    </label>
                    <textarea
                      value={licenseMessage}
                      onChange={(e) => setLicenseMessage(e.target.value)}
                      placeholder="Tell us about your intended use — platform, territory, campaign details, budget range, etc."
                      rows={4}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>

                  {licenseError && (
                    <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{licenseError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={licenseSubmitting}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: licenseSubmitting ? '#666' : '#f59e0b', color: '#000000', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: licenseSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {licenseSubmitting ? 'Sending...' : (
                      <>Send Inquiry <ArrowRight style={{ width: '16px', height: '16px' }} /></>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        * { box-sizing: border-box; }
        input::placeholder { color: #555; }
        textarea::placeholder { color: #555; }
        input:focus { border-color: #f59e0b !important; }
        textarea:focus { border-color: #f59e0b !important; }
        select option { background: #1a1a1a; }
      `}</style>
    </div>
  )
}
