'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Play, Search, Filter, Clock, User, Tag } from 'lucide-react'

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
  }
}

// Helper to convert YouTube/Vimeo URLs to embed format
function getEmbedUrl(url: string): string {
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = ''
    if (url.includes('youtube.com/watch')) {
      videoId = new URL(url).searchParams.get('v') || ''
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0] || ''
    return `https://player.vimeo.com/video/${videoId}?autoplay=1`
  }

  return url
}

// Helper to get thumbnail from video URL if not provided
function getThumbnailUrl(videoUrl: string, providedThumbnail: string | null): string {
  if (providedThumbnail) return providedThumbnail

  // YouTube thumbnail
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    let videoId = ''
    if (videoUrl.includes('youtube.com/watch')) {
      videoId = new URL(videoUrl).searchParams.get('v') || ''
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  // Vimeo thumbnail - would need API call, using placeholder for now
  if (videoUrl.includes('vimeo.com')) {
    return 'https://placehold.co/1280x720/1e293b/ffffff?text=Vimeo+Video'
  }

  return 'https://placehold.co/1280x720/1e293b/ffffff?text=Video'
}

// Helper to format runtime
function formatRuntime(seconds: number | null): string {
  if (!seconds) return 'Unknown'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function CatalogPage() {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<CatalogEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')

  useEffect(() => {
    fetchCatalog()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [entries, searchQuery, selectedGenre])

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

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.submission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.submission.filmmaker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.public_description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by genre
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(entry => entry.submission.genre === selectedGenre)
    }

    setFilteredEntries(filtered)
  }

  const genres: string[] = ['all', ...Array.from(new Set(entries.map(e => e.submission.genre).filter((g): g is string => g !== null)))]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Rights Verified Catalog
              </h1>
              <p className="text-gray-600">
                AI-generated films with verified rights documentation. Ready for commercial licensing.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{entries.length} Available</span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by title, filmmaker, or description..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
              >
                {genres.map(genre => (
                  <option key={genre} value={genre}>
                    {genre === 'all' ? 'All Genres' : genre}
                  </option>
                ))}
              </select>
              <Button variant="outline" className="hidden sm:flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-500">Loading catalog...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || selectedGenre !== 'all' ? 'No results found' : 'No entries in the catalog yet'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {searchQuery || selectedGenre !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Approved works will appear here once filmmakers opt in.'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredEntries.length}</span> {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEntries.map((entry) => (
                <Card
                  key={entry.id}
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 shadow-lg bg-white"
                  onClick={() => setSelectedVideo(entry)}
                >
                  <div className="relative aspect-video bg-gray-900 overflow-hidden">
                    <img
                      src={getThumbnailUrl(entry.video_url, entry.thumbnail_url)}
                      alt={entry.submission.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-10 h-10 text-gray-900 ml-1" fill="currentColor" />
                      </div>
                    </div>

                    {/* Catalog ID badge */}
                    {entry.catalog_id && (
                      <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs font-mono px-3 py-1.5 rounded-full border border-white/20">
                        {entry.catalog_id}
                      </div>
                    )}

                    {/* Runtime badge */}
                    {entry.submission.runtime && (
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRuntime(entry.submission.runtime)}
                      </div>
                    )}
                  </div>

                  <CardContent className="p-5">
                    <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {entry.submission.title}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <User className="w-4 h-4" />
                      <span className="line-clamp-1">{entry.submission.filmmaker_name}</span>
                    </div>

                    {entry.submission.genre && (
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                          {entry.submission.genre}
                        </span>
                      </div>
                    )}

                    {entry.public_description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {entry.public_description}
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedVideo(entry)
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Watch & License
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div className="flex-1 mr-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {selectedVideo.submission.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>{selectedVideo.submission.filmmaker_name}</span>
                  </div>
                  {selectedVideo.catalog_id && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-blue-600">{selectedVideo.catalog_id}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
                className="rounded-full w-10 h-10 p-0 hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black">
              <iframe
                src={getEmbedUrl(selectedVideo.video_url)}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t">
              {selectedVideo.public_description && (
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {selectedVideo.public_description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {selectedVideo.submission.genre && (
                    <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1.5 rounded-full font-medium">
                      {selectedVideo.submission.genre}
                    </span>
                  )}
                  {selectedVideo.submission.runtime && (
                    <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {formatRuntime(selectedVideo.submission.runtime)}
                    </span>
                  )}
                </div>

                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6">
                  Request License
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
