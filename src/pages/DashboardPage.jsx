import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import DocumentCard from '../components/DocumentCard'
import api from '../lib/api'

export default function DashboardPage() {
  const { logout } = useAuth()
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const pollingRefs = useRef({})

  // Load document list on mount
  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data)
      // Resume polling for any non-terminal documents
      res.data.forEach((doc) => {
        if (doc.status === 'pending' || doc.status === 'processing') {
          startPolling(doc.uuid)
        }
      })
    } catch {
      setError('Failed to load documents.')
    }
  }

  function startPolling(uuid) {
    // Avoid duplicate intervals
    if (pollingRefs.current[uuid]) return

    const intervalId = setInterval(async () => {
      try {
        const res = await api.get(`/documents/${uuid}/status`)
        const { status } = res.data

        setDocuments((prev) =>
          prev.map((d) => (d.uuid === uuid ? { ...d, status } : d))
        )

        if (status === 'complete' || status === 'failed') {
          clearInterval(pollingRefs.current[uuid])
          delete pollingRefs.current[uuid]
        }
      } catch {
        clearInterval(pollingRefs.current[uuid])
        delete pollingRefs.current[uuid]
      }
    }, 3000)

    pollingRefs.current[uuid] = intervalId
  }

  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval)
    }
  }, [])

  function handleFileButtonClick() {
    fileInputRef.current.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    e.target.value = ''

    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const newDoc = res.data
      setDocuments((prev) => [newDoc, ...prev])
      startPolling(newDoc.uuid)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">DocuWise</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Upload section */}
        <section className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-4 shadow-sm">
          <p className="text-gray-600 text-sm">Upload a PDF to start chatting with it</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={handleFileButtonClick}
            disabled={uploading}
            className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg
              hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading…' : 'Upload PDF'}
          </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </section>

        {/* Document library */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Documents</h2>

          {documents.length === 0 ? (
            <p className="text-gray-400 text-sm">No documents yet. Upload one above.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <DocumentCard key={doc.uuid} doc={doc} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
