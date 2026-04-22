import { useNavigate } from 'react-router-dom'

const STATUS_STYLES = {
  pending:    'bg-gray-100 text-gray-600',
  processing: 'bg-yellow-100 text-yellow-700',
  complete:   'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function DocumentCard({ doc }) {
  const navigate = useNavigate()
  const isComplete = doc.status === 'complete'

  function handleClick() {
    if (isComplete) {
      navigate(`/chat/${doc.uuid}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 shadow-sm transition-shadow
        ${isComplete ? 'cursor-pointer hover:shadow-md' : 'cursor-default opacity-80'}`}
    >
      <p
        className="font-medium text-gray-900 truncate"
        title={doc.filename}
      >
        {doc.filename}
      </p>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize
            ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.pending}`}
        >
          {doc.status}
        </span>
        <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
      </div>
    </div>
  )
}
