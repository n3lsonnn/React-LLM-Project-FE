# DocuWise — Frontend Context

## What this project is
DocuWise is a full-stack RAG document intelligence platform. Users 
upload PDFs and chat with them. Answers stream word by word in real 
time with a citations panel showing the source sections from the 
document.

This file covers the FRONTEND only. The backend lives in a separate 
repo: React-LLM-Project-BE.

## How the two repos connect
- This frontend calls the backend at its Railway URL
- Set VITE_API_URL in .env.local for development:
    VITE_API_URL=http://localhost:8000
- Set VITE_API_URL in .env.production for deployment:
    VITE_API_URL=https://your-app.railway.app
- All API calls go through src/lib/api.js (Axios instance)
  which attaches the JWT token to every request automatically
- The chat page uses the browser's native EventSource API 
  (not Axios) to consume the SSE stream from POST /chat/query
- JWT token is stored in React state via AuthContext — never 
  in localStorage

## My background
- MSc Artificial Intelligence with Distinction, University of South Wales
- Internship at FTAI Aviation — built production React + Tailwind 
  frontend for a workflow management system used in Montreal
- The styling and component approach here should mirror that FTAI 
  project: clean, professional, functional
- OS: Windows, deploying to Vercel

## Tech stack
- Framework: React 18 + Vite
- Routing: React Router v6
- HTTP client: Axios (for all requests except SSE streaming)
- SSE streaming: browser native EventSource API
- Styling: Tailwind CSS
- UI primitives: Radix UI
- Icons: lucide-react
- File upload: react-dropzone
- Deployment: Vercel (auto-deploys on push to main)

## Folder structure
src/
  components/    ← reusable UI: UploadZone, MessageList, ChatInput,
                    CitationsPanel, ProtectedRoute
  pages/         ← Login.jsx, Register.jsx, Documents.jsx, Chat.jsx
  contexts/      ← AuthContext.jsx (JWT token + user state)
  lib/           ← api.js (Axios instance with interceptor)
  App.jsx        ← router setup
  main.jsx       ← entry point

## Routes
/login           ← public
/register        ← public
/app             ← protected (redirects to /login if no token)
/app/documents   ← document library, upload new PDFs
/app/chat/:id    ← chat page for a specific document

## Key architecture decisions
- AuthContext stores JWT in React state (useState), not localStorage
  Reason: localStorage is vulnerable to XSS attacks
- Axios interceptor in api.js attaches Authorization: Bearer {token}
  to every request so individual components don't handle auth
- SSE streaming uses EventSource, not Axios
  EventSource is the browser's native API for Server-Sent Events
  It cannot send POST bodies, so the backend SSE endpoint uses GET
  with query parameters for document_id and question
- Streaming state: append tokens to a string in useState, use useRef
  to avoid stale closures in the EventSource callback
- Poll /documents/{id}/status every 2 seconds after upload until
  status === "ready", then show success and enable chat button

## Component responsibilities
Login.jsx / Register.jsx
  → controlled form inputs, call auth API, store token in context,
    redirect to /app/documents on success

ProtectedRoute.jsx
  → reads token from AuthContext, redirects to /login if missing

Documents.jsx
  → fetch GET /documents/ on mount, render document cards
  → each card shows filename, status badge, chunk count, date
  → click a document card → navigate to /app/chat/{id}

UploadZone.jsx (used inside Documents.jsx)
  → react-dropzone for drag-and-drop, PDF only
  → Axios upload with onUploadProgress for progress bar
  → triggers status polling after upload completes

Chat.jsx
  → two-column layout: message thread left, citations panel right
  → loads chat history on mount (GET /chat/history/{document_id})
  → on submit: adds user message to state, opens EventSource,
    appends tokens as they arrive, sets citations on done event

CitationsPanel.jsx
  → receives citations array from Chat.jsx after streaming completes
  → each citation shows section title + text snippet

## 12-day plan — frontend days
Day 1: npm create vite, install dependencies, confirm dev server runs
Day 4: AuthContext, Login page, Register page, ProtectedRoute, 
        test full auth flow with backend running locally
Day 7: App shell layout, UploadZone with progress, Documents page,
        status polling after upload
Day 8: Chat page, MessageList, ChatInput, SSE streaming with 
        EventSource, CitationsPanel
Day 11: Loading states, error messages, empty states, 
         mobile responsive layout
Day 12: .env.production, deploy to Vercel, test against live backend,
         update README with live URL and demo GIF

## How to run locally
cd frontend
npm install
# create .env.local with: VITE_API_URL=http://localhost:8000
npm run dev
# runs at http://localhost:5173