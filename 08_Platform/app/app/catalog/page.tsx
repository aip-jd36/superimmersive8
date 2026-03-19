'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Play } from 'lucide-react'

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

export default function CatalogPage() {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<CatalogEntry | null>(null)

  useEffect(() => {
    fetchCatalog()
  }, [])

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">SI8 Rights Verified Catalog</h1>
          <p className="mt-2 text-gray-600">
            AI-generated films with verified rights documentation. Ready for licensing.
          </p>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading catalog...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No entries in the catalog yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Approved works will appear here once filmmakers opt in.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedVideo(entry)}
              >
                <div className="relative aspect-video bg-gray-900">
                  <img
                    src={getThumbnailUrl(entry.video_url, entry.thumbnail_url)}
                    alt={entry.submission.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                  {entry.catalog_id && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {entry.catalog_id}
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{entry.submission.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    by {entry.submission.filmmaker_name}
                  </p>
                  {entry.submission.genre && (
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {entry.submission.genre}
                    </span>
                  )}
                  {entry.public_description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                      {entry.public_description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold">{selectedVideo.submission.title}</h2>
                <p className="text-sm text-gray-600">by {selectedVideo.submission.filmmaker_name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
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
            <div className="p-4 border-t">
              {selectedVideo.public_description && (
                <p className="text-sm text-gray-700 mb-3">
                  {selectedVideo.public_description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {selectedVideo.submission.genre && (
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {selectedVideo.submission.genre}
                    </span>
                  )}
                  {selectedVideo.catalog_id && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                      {selectedVideo.catalog_id}
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm">
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
