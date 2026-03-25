import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getDispute,
  getAdminDispute,
  getDisputeActivities,
  getDisputeMessages,
  postDisputeMessage,
  getDisputeEvidence,
  postDisputeEvidence,
  getDisputeEvidenceFile,
} from '../services/api';

const STATUS_STYLES = {
  open:         'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved:     'bg-green-100 text-green-700',
  refunded:     'bg-purple-100 text-purple-700',
};

const STATUS_LABELS = {
  open:         'Open',
  under_review: 'Under Review',
  resolved:     'Resolved',
  refunded:     'Refunded',
};

const ROLE_LABELS = {
  buyer:  'Buyer',
  seller: 'Seller',
  admin:  'Admin',
};

function formatActivityLabel(a) {
  const name = a.user?.name ?? 'Someone';
  switch (a.type) {
    case 'dispute_opened':
      return `${name} opened the dispute`;
    case 'message_posted':
      return `${name} posted a message`;
    case 'evidence_uploaded':
      return `${name} uploaded evidence`;
    case 'dispute_resolved':
      return a.data?.decision === 'refund_buyer'
        ? `${name} resolved the dispute (buyer refunded)`
        : `${name} resolved the dispute (seller paid)`;
    default:
      return `${name} — ${a.type}`;
  }
}

export default function DisputeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [dispute, setDispute] = useState(null);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceType, setEvidenceType] = useState('note');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidencePath, setEvidencePath] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const evidenceFileInputRef = useRef(null);
  const imageUrlsRef = useRef({});

  const loadDispute = useCallback(async () => {
    if (!id) return;
    try {
      const data = user?.is_admin
        ? await getAdminDispute(id)
        : await getDispute(id);
      setDispute(data);
      setError('');
    } catch (e) {
      setError(e.status === 403 ? 'Access denied.' : 'Dispute not found.');
      setDispute(null);
    }
  }, [id, user?.is_admin]);

  const loadActivities = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getDisputeActivities(id);
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setActivities([]);
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getDisputeMessages(id);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  }, [id]);

  const loadEvidence = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getDisputeEvidence(id);
      setEvidences(Array.isArray(data) ? data : []);
    } catch {
      setEvidences([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Invalid dispute ID.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadDispute();
      if (cancelled) return;
      await Promise.all([loadActivities(), loadMessages(), loadEvidence()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, loadDispute, loadActivities, loadMessages, loadEvidence]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!id || !messageBody.trim() || messageSubmitting) return;
    setMessageSubmitting(true);
    setMessageError('');
    try {
      const msg = await postDisputeMessage(id, { body: messageBody.trim() });
      setMessages((prev) => [...prev, msg]);
      setMessageBody('');
      loadActivities();
    } catch (e) {
      setMessageError(e.message || 'Failed to send message.');
    } finally {
      setMessageSubmitting(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!id || evidenceSubmitting) return;

    if (evidenceType === 'note' && !evidenceDescription.trim()) {
      setEvidenceError('Description is required for a note.');
      return;
    }
    if (evidenceType === 'link' && !evidencePath.trim()) {
      setEvidenceError('URL is required for a link.');
      return;
    }
    if ((evidenceType === 'image' || evidenceType === 'file') && !evidenceFile) {
      setEvidenceError('Please select a file.');
      return;
    }

    setEvidenceSubmitting(true);
    setEvidenceError('');
    try {
      const formData = new FormData();
      formData.append('type', evidenceType);
      if (evidenceTitle.trim()) formData.append('title', evidenceTitle.trim());
      if (evidenceType === 'note') formData.append('description', evidenceDescription.trim());
      if (evidenceType === 'link') formData.append('path', evidencePath.trim());
      if ((evidenceType === 'image' || evidenceType === 'file') && evidenceFile) {
        formData.append('file', evidenceFile);
      }

      const ev = await postDisputeEvidence(id, formData);
      setEvidences((prev) => [ev, ...prev]);
      loadActivities();
      setEvidenceType('note');
      setEvidenceDescription('');
      setEvidencePath('');
      setEvidenceFile(null);
      setEvidenceTitle('');
      if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
    } catch (e) {
      setEvidenceError(e.message || 'Failed to upload evidence.');
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  const handleViewEvidenceFile = async (ev) => {
    if (ev.type === 'link') {
      const candidate = typeof ev.path === 'string' ? ev.path.trim() : '';
      if (/^https?:\/\//i.test(candidate)) {
        window.open(candidate, '_blank', 'noopener,noreferrer');
        return;
      }

      // Backend may return { url } instead of a redirect; open the safe URL when present.
      try {
        const blob = await getDisputeEvidenceFile(id, ev.id);
        const text = await blob.text();
        const parsed = JSON.parse(text);
        if (parsed?.url) {
          window.open(parsed.url, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {
        // ignore and fall back to opening the stored value (if any)
      }

      if (candidate) {
        window.open(candidate, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (ev.type !== 'image' && ev.type !== 'file') return;
    try {
      const blob = await getDisputeEvidenceFile(id, ev.id);
      const url = URL.createObjectURL(blob);
      if (ev.type === 'image') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = ev.original_name || 'evidence';
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setEvidenceError('Failed to load file.');
    }
  };

  useEffect(() => {
    const ref = imageUrlsRef.current;
    return () => {
      Object.values(ref).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const [imagePreviews, setImagePreviews] = useState({});
  useEffect(() => {
    const imageEvs = evidences.filter((e) => e.type === 'image' && e.storage_disk !== 'url');
    const ids = new Set(imageEvs.map((e) => e.id));
    Object.keys(imageUrlsRef.current).forEach((k) => {
      if (!ids.has(Number(k))) {
        URL.revokeObjectURL(imageUrlsRef.current[k]);
        delete imageUrlsRef.current[k];
      }
    });
    if (imageEvs.length === 0) {
      setImagePreviews({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next = {};
      for (const ev of imageEvs) {
        if (cancelled) return;
        if (imageUrlsRef.current[ev.id]) {
          next[ev.id] = imageUrlsRef.current[ev.id];
          continue;
        }
        try {
          const blob = await getDisputeEvidenceFile(id, ev.id);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          imageUrlsRef.current[ev.id] = url;
          next[ev.id] = url;
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setImagePreviews(next);
    };
    load();
    return () => {
      cancelled = true;
      Object.values(imageUrlsRef.current).forEach(URL.revokeObjectURL);
      imageUrlsRef.current = {};
    };
  }, [id, evidences]);

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Invalid dispute.</p>
        <Link to="/disputes" className="mt-4 inline-block text-m4m-purple hover:underline">← Back to disputes</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="h-6 bg-gray-100 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-2/3 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error || 'Dispute not found.'}</p>
        <Link to="/disputes" className="mt-4 inline-block text-m4m-purple hover:underline">← Back to disputes</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/disputes" className="text-sm text-m4m-purple hover:underline mb-6 inline-block">
        ← Back to disputes
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[dispute.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[dispute.status] ?? dispute.status}
          </span>
          {dispute.admin_decision && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              dispute.admin_decision === 'refund_buyer' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
            }`}>
              {dispute.admin_decision === 'refund_buyer' ? 'Refunded' : 'Released'}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Order: {dispute.order?.order_number ?? `#${dispute.order_id}`}
        </h1>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Buyer:</span> {dispute.buyer?.name ?? '—'}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Seller:</span> {dispute.seller?.name ?? '—'}
        </p>
        <p className="text-sm text-gray-700 mt-2">
          <span className="font-medium">Reason:</span> {dispute.reason}
        </p>
        {dispute.description && (
          <p className="text-sm text-gray-600 mt-1">{dispute.description}</p>
        )}
        {dispute.admin_note && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Admin note:</span> {dispute.admin_note}
            </p>
          </div>
        )}
      </div>

      {/* Main content: Timeline (left) and Messages + Evidence (right) */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Timeline */}
        <section>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="divide-y divide-gray-100">
              {activities.length === 0 ? (
                <p className="py-4 text-sm text-gray-500 text-center">No activity yet.</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="py-4 flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-m4m-purple shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatActivityLabel(a)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Messages + Evidence */}
        <div className="space-y-6">
          {/* Messages */}
          <section>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{m.user?.name ?? '—'}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                          {ROLE_LABELS[m.role] ?? m.role}
                        </span>
                        <span className="text-xs text-gray-400">
                          {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  maxLength={5000}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  disabled={messageSubmitting}
                />
                <button
                  type="submit"
                  disabled={messageSubmitting || !messageBody.trim()}
                  className="px-4 py-2 rounded-lg bg-m4m-purple text-white text-sm font-semibold hover:bg-m4m-purple-dark disabled:opacity-50 transition-colors"
                >
                  {messageSubmitting ? 'Sending…' : 'Send'}
                </button>
              </form>
              {messageError && <p className="mt-1 text-sm text-red-600">{messageError}</p>}
            </div>
          </section>

          {/* Evidence */}
          <section>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evidence</h2>
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 mb-4">
                {evidences.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No evidence yet.</p>
                ) : (
                  evidences.map((ev) => (
                    <div key={ev.id} className="p-4">
                      <div className="flex items-start gap-3">
                        {ev.type === 'image' && imagePreviews[ev.id] && (
                          <img
                            src={imagePreviews[ev.id]}
                            alt={ev.title || 'Evidence'}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 shrink-0 cursor-pointer"
                            onClick={() => handleViewEvidenceFile(ev)}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{ev.title || `${ev.type} evidence`}</span>
                            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{ev.type}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {ev.user?.name ?? 'Unknown'}
                            {ev.role && (
                              <>
                                {' '}
                                ({ROLE_LABELS[ev.role] ?? ev.role})
                              </>
                            )}
                            {ev.created_at && (
                              <>
                                {' '}
                                &bull;{' '}
                                {new Date(ev.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </>
                            )}
                          </p>
                          {ev.description && <p className="text-sm text-gray-600">{ev.description}</p>}
                          {(ev.type === 'image' || ev.type === 'file' || ev.type === 'link') && (
                            <button
                              type="button"
                              onClick={() => handleViewEvidenceFile(ev)}
                              className="mt-2 text-sm font-medium text-m4m-purple hover:underline"
                            >
                              {ev.type === 'link' ? 'Open link' : 'View file'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleUploadEvidence} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Add evidence</h3>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={evidenceType}
                      onChange={(e) => { setEvidenceType(e.target.value); setEvidenceError(''); }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="note">Note</option>
                      <option value="link">Link</option>
                      <option value="image">Image</option>
                      <option value="file">File</option>
                    </select>
                  </div>
                  {evidenceType === 'note' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description (required)</label>
                      <textarea
                        value={evidenceDescription}
                        onChange={(e) => setEvidenceDescription(e.target.value)}
                        rows={3}
                        placeholder="Add your note..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                        disabled={evidenceSubmitting}
                      />
                    </div>
                  )}
                  {evidenceType === 'link' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">URL (required)</label>
                      <input
                        type="url"
                        value={evidencePath}
                        onChange={(e) => { setEvidencePath(e.target.value); setEvidenceError(''); }}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        disabled={evidenceSubmitting}
                      />
                    </div>
                  )}
                  {(evidenceType === 'image' || evidenceType === 'file') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">File (required, max 10MB)</label>
                      <input
                        ref={evidenceFileInputRef}
                        type="file"
                        accept={evidenceType === 'image' ? 'image/*' : '*'}
                        onChange={(e) => { setEvidenceFile(e.target.files?.[0] ?? null); setEvidenceError(''); }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        disabled={evidenceSubmitting}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Title (optional)</label>
                    <input
                      type="text"
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                      placeholder="Brief title"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      disabled={evidenceSubmitting}
                    />
                  </div>
                </div>
                {evidenceError && <p className="mb-3 text-sm text-red-600">{evidenceError}</p>}
                <button
                  type="submit"
                  disabled={evidenceSubmitting}
                  className="px-4 py-2 rounded-lg bg-m4m-purple text-white text-sm font-semibold hover:bg-m4m-purple-dark disabled:opacity-50 transition-colors"
                >
                  {evidenceSubmitting ? 'Uploading…' : 'Add evidence'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
