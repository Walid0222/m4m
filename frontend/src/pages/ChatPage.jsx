import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getEcho } from '../echo';
import {
  getConversations,
  getConversation,
  sendMessage as apiSendMessage,
  getSupportConversation,
  getSupportMessages,
  sendSupportMessage,
  paginatedItems,
  getToken,
  sendTyping as apiSendTyping,
  markConversationSeen,
} from '../services/api';
import { isSellerOnline } from '../lib/sellerOnline';
import ChatBox from '../components/ChatBox';

// Synthetic "M4M Support" conversation object
const SUPPORT_CONV = {
  id: 'support',
  _isSupport: true,
  other_user: { id: 'support', name: 'M4M Support' },
};

// System welcome message shown at the top of every support chat
const SYSTEM_WELCOME = {
  id: '__system_welcome__',
  _system: true,
  body: '🔒 Safety Reminder\n\nFor your safety, keep all communication and payments within M4M. Buy only from verified sellers whenever possible. Never share sensitive information such as passwords or recovery codes. Transactions completed outside M4M are not protected by our support team.',
  created_at: null,
};

/**
 * Global support store key — one shared object in localStorage so that
 * both the user's ChatPage and the admin dashboard read/write the same data.
 *
 * Shape: { [userId]: { userId, userName, userEmail, msgs: Message[] } }
 */
const SUPPORT_STORE_KEY = 'm4m_support_store';

function readSupportStore() {
  try { return JSON.parse(localStorage.getItem(SUPPORT_STORE_KEY) || '{}'); } catch { return {}; }
}

function writeSupportStore(store) {
  localStorage.setItem(SUPPORT_STORE_KEY, JSON.stringify(store));
}

/** Get the messages array for a specific user from the global store. */
function loadSupportMsgs(userId) {
  const store = readSupportStore();
  return store[userId]?.msgs ?? [];
}

/** Append a message to a user's thread in the global store. */
function appendSupportMsg(userId, userMeta, msg) {
  const store = readSupportStore();
  const thread = store[userId] ?? { userId, userName: userMeta?.name, userEmail: userMeta?.email, msgs: [] };
  thread.msgs = [...thread.msgs, msg];
  // keep user meta up to date
  if (userMeta?.name) thread.userName = userMeta.name;
  if (userMeta?.email) thread.userEmail = userMeta.email;
  store[userId] = thread;
  writeSupportStore(store);
}

export default function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  // Support messages are loaded once user is known (see useEffect below)
  const [supportMessages, setSupportMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  // Mobile: show list or chat
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  const selectedIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const urlConversationLoadedRef = useRef(null);
  const channelsRef = useRef({});
  selectedIdRef.current = selected?.id;

  // ── Load conversations ───────────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    if (!getToken()) return;
    try {
      const result = await getConversations();
      setConversations(paginatedItems(result));
    } catch { setConversations([]); }
  }, []);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const result = await getConversations();
        if (!cancelled) setConversations(paginatedItems(result));
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load support messages + poll for admin replies ────────────────────────
  const loadSupportMessages = useCallback(async () => {
    if (!user?.id || !getToken()) return;
    try {
      const msgs = await getSupportMessages();
      const arr = Array.isArray(msgs) ? msgs : (msgs?.data ?? []);
      // Merge with localStorage messages to avoid losing optimistic updates
      const localMsgs = loadSupportMsgs(user.id);
      const serverIds = new Set(arr.map((m) => m.id));
      const localOnly = localMsgs.filter((m) => !serverIds.has(m.id) && m._local);
      const combined = [...arr, ...localOnly].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setSupportMessages(combined);
    } catch {
      // Backend unavailable — fall back to localStorage
      setSupportMessages(loadSupportMsgs(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) { setSupportMessages([]); return; }
    loadSupportMessages();
    const interval = setInterval(loadSupportMessages, 5000);
    return () => clearInterval(interval);
  }, [user?.id, loadSupportMessages]);

  // ── Auto-select conversation from URL ────────────────────────────────────
  const convIdFromUrl = searchParams.get('conversation');
  useEffect(() => {
    if (!convIdFromUrl) return;
    const id = Number(convIdFromUrl);
    if (!Number.isFinite(id)) return;

    // If already selected, nothing to do
    if (selected?.id === id) return;

    // Try to find in the already loaded conversations list first
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setSelected((s) => (s?.id === id ? s : conv));
      setMobileView('chat');
      urlConversationLoadedRef.current = id;
      return;
    }

    // Fallback: fetch the conversation directly if we haven't already tried
    if (!getToken()) return;
    if (urlConversationLoadedRef.current === id) return;
    urlConversationLoadedRef.current = id;

    (async () => {
      try {
        const data = await getConversation(id);
        const convData = data?.conversation || data;
        if (convData && convIdFromUrl === String(id)) {
          setSelected(convData);
          setMobileView('chat');
        }
      } catch {
        // ignore: invalid or inaccessible conversation id
      }
    })();
  }, [convIdFromUrl, conversations, selected?.id]);

  // ── Select conversation ──────────────────────────────────────────────────
  const handleSelectConversation = useCallback((conv) => {
    setSelected(conv);
    setMobileView('chat');
    if (conv.id !== 'support') {
      navigate(`/chat?conversation=${conv.id}`, { replace: true });
      setUnread((prev) => ({ ...prev, [conv.id]: 0 }));
    } else {
      navigate('/chat', { replace: true });
    }
  }, [navigate]);

  // ── Load messages for selected conversation ──────────────────────────────
  useEffect(() => {
    if (!selected?.id || selected.id === 'support' || !getToken()) return;
    setPage(1);
    setHasMoreMessages(true);
    setUnread((prev) => ({ ...prev, [selected.id]: 0 }));
    let cancelled = false;
    (async () => {
      try {
        const data = await getConversation(selected.id);
        const paginator = data?.messages;
        const list = paginator ? paginatedItems(paginator) : [];
        if (!cancelled && Array.isArray(list)) {
          const reversed = [...list].reverse();
          setMessages((prev) => {
            const serverIds = new Set(reversed.map((m) => m.id));
            const pendingOnly = prev.filter((m) => m._pending && !serverIds.has(m.id));
            return [...reversed, ...pendingOnly];
          });

          const currentPage = paginator?.current_page ?? 1;
          const lastPage = paginator?.last_page ?? 1;
          setPage(currentPage);
          setHasMoreMessages(currentPage < lastPage);

          // Refresh conversation list so unread counters update
          refreshConversations();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('chat:refresh'));
          }

          // Mark conversation as seen (read receipts)
          markConversationSeen(selected.id).catch(() => {});
        } else if (!cancelled && !Array.isArray(list)) {
          setMessages([]);
        }
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selected?.id]);

  // ── Auto-refresh messages every 20s (fallback if Echo fails) ─────────────
  useEffect(() => {
    if (!selected?.id || selected.id === 'support' || !getToken()) return;
    const interval = setInterval(async () => {
      try {
        const data = await getConversation(selected.id);
        const list = data?.messages ? paginatedItems(data.messages) : [];
        if (!Array.isArray(list)) return;
        const reversed = [...list].reverse();
        setMessages((prev) => {
          // merge: keep pending, add new from server
          const serverIds = new Set(reversed.map((m) => m.id));
          const pendingOnly = prev.filter((m) => m._pending && !serverIds.has(m.id));
          return [...reversed, ...pendingOnly];
        });
      } catch {}
    }, 20000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  // ── Echo: subscribe to all conversation channels ─────────────────────────
  useEffect(() => {
    if (!user?.id || !getToken() || conversations.length === 0) return;
    let echoInstance;
    try {
      echoInstance = getEcho();
    } catch {
      return;
    }
    const current = channelsRef.current;

        conversations.forEach((c) => {
      const key = `conversation.${c.id}`;
      if (current[key]) return;
      try {
            // TEMP: debug joining channels
            // eslint-disable-next-line no-console
            console.log('Joining conversation channel', key);

            const channel = echoInstance.private(key);
        current[key] = channel;

        channel.listen('.message.sent', (payload) => {
          const msg = payload.message;
          if (!msg) return;

          const isForSelected = c.id === selectedIdRef.current;

          if (isForSelected) {
            // Incoming message in the currently open conversation: append immediately if not already present
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          } else {
            // Incoming message in another conversation: bump unread count and refresh the list
            setUnread((prev) => ({ ...prev, [c.id]: (prev[c.id] || 0) + 1 }));
            refreshConversations();
          }

          // Update header chat badge and notifications
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('chat:refresh'));
            window.dispatchEvent(new Event('notifications:refresh'));
          }
        });

        channel.listen('.message.delivered', (event) => {
          // eslint-disable-next-line no-console
          console.log('[Echo] message.delivered received', event);
          const { messageId, conversationId } = event || {};
          if (!messageId || conversationId !== c.id) return;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId && m.user_id === user?.id && m.status !== 'seen'
                ? { ...m, status: 'delivered' }
                : m
            )
          );
        });

        channel.listen('.message.seen', (event) => {
          // eslint-disable-next-line no-console
          console.log('[Echo] message.seen received', event);
          const { messageIds, conversationId } = event || {};
          if (!Array.isArray(messageIds) || conversationId !== c.id) return;

          setMessages((prev) =>
            prev.map((m) =>
              messageIds.includes(m.id) && m.user_id === user?.id
                ? { ...m, status: 'seen', read_at: m.read_at ?? new Date().toISOString() }
                : m
            )
          );
        });

        channel.listen('.user.typing', (event) => {
          // TEMP: debug typing events
          // eslint-disable-next-line no-console
          console.log('[Echo] user.typing received', event, 'for conversation', c.id, 'selected', selectedIdRef.current);

          const { userId, conversationId } = event || {};
          if (!userId || userId === user.id) return;
          if (conversationId !== c.id || c.id !== selectedIdRef.current) return;

          setIsTyping(true);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 2000);
        });
      } catch {}
    });

    return () => {
      Object.keys(current).forEach((k) => {
        try { echoInstance.leave(k); } catch {}
        delete current[k];
      });
    };
  }, [user?.id, conversations, refreshConversations]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    if (!selected?.id) {
      // No active conversation selected – do not attempt to send
      return;
    }

    // M4M Support chat — send to backend, fallback to localStorage
    if (selected.id === 'support') {
      if (!user?.id) return;
      const optimisticMsg = {
        id: `s_${Date.now()}`,
        body: newMessage.trim(),
        user_id: user.id,
        _from: 'user',
        _local: true,
        sender: { id: user.id, name: user.name, email: user.email },
        created_at: new Date().toISOString(),
      };
      setSupportMessages((prev) => [...prev, optimisticMsg]);
      setNewMessage('');

      try {
        const saved = await sendSupportMessage(optimisticMsg.body);
        // Replace optimistic with real message from server
        setSupportMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? { ...saved, _from: 'user' } : m))
        );
        // Also persist to localStorage as backup
        appendSupportMsg(user.id, { name: user.name, email: user.email }, optimisticMsg);
      } catch {
        // Backend failed — keep in localStorage only
        appendSupportMsg(user.id, { name: user.name, email: user.email }, optimisticMsg);
      }
      return;
    }

    if (!getToken()) return;

    // Optimistic: show message immediately as pending
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      _tempId: tempId,
      _pending: true,
      body: newMessage.trim(),
      user_id: user?.id,
      sender: user ? { id: user.id, name: user.name } : undefined,
      created_at: new Date().toISOString(),
    };
    // TEMP: debug optimistic insert
    // eslint-disable-next-line no-console
    console.log('[ChatPage] sendMessage optimistic insert', optimisticMsg);
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');
    setSending(true);

    try {
      const message = await apiSendMessage(selected.id, optimisticMsg.body);
      if (message) {
        // Replace the optimistic message with the server-saved one.
        // If the optimistic message is no longer present (e.g. race with another refresh),
        // append the server message if it's not already in the list.
        setMessages((prev) => {
          let replaced = false;
          let next = prev.map((m) => {
            if (m._tempId === tempId) {
              replaced = true;
              return { ...message };
            }
            return m;
          });
          if (!replaced && message.id != null && !next.some((m) => m.id === message.id)) {
            next = [...next, message];
          }
          return next;
        });
      } else {
        // Remove pending if failed
        setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
      }
      // Lightly refresh the conversation from the server and merge with any remaining pending messages
      try {
        const data = await getConversation(selected.id);
        const list = data?.messages ? paginatedItems(data.messages) : [];
        if (Array.isArray(list)) {
          const reversed = [...list].reverse();
          setMessages((prev) => {
            const serverIds = new Set(reversed.map((m) => m.id));
            const pendingOnly = prev.filter((m) => m._pending && !serverIds.has(m.id));
            return [...reversed, ...pendingOnly];
          });
        }
      } catch {
        // ignore; Echo and fallback polling will still update messages
      }
      refreshConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleTyping = useCallback(() => {
    if (!selected?.id || selected.id === 'support' || !getToken()) return;
    // TEMP: debug typing trigger
    // eslint-disable-next-line no-console
    console.log('[ChatPage] sending typing for conversation', selected.id);
    apiSendTyping(selected.id).catch(() => {});
  }, [selected?.id]);

  const loadPreviousMessages = useCallback(async () => {
    if (!selected?.id || selected.id === 'support' || !getToken()) return;
    if (loadingOlderMessages || !hasMoreMessages) return;

    setLoadingOlderMessages(true);
    try {
      const nextPage = page + 1;
      const data = await getConversation(selected.id, { page: nextPage });
      const paginator = data?.messages;
      const olderList = paginator ? paginatedItems(paginator) : [];
      if (!Array.isArray(olderList) || olderList.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      const olderReversed = [...olderList].reverse();

      setMessages((prev) => {
        const merged = [...olderReversed, ...prev];
        const map = new Map();
        for (const m of merged) {
          const key = m.id ?? m._tempId;
          if (!key || !map.has(key)) {
            map.set(key, m);
          }
        }
        const deduped = Array.from(map.values());
        // Ensure chronological order by created_at
        deduped.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ta - tb;
        });
        return deduped;
      });

      const currentPage = paginator?.current_page ?? nextPage;
      const lastPage = paginator?.last_page ?? currentPage;
      setPage(currentPage);
      setHasMoreMessages(currentPage < lastPage);
    } catch {
      // ignore load errors for older messages
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [selected?.id, page, hasMoreMessages, loadingOlderMessages]);

  // ── Derived ───────────────────────────────────────────────────────────────
  // TEMP: debug ChatPage render and messages length
  // eslint-disable-next-line no-console
  console.log('[ChatPage] render, messages length =', messages.length);

  const otherUser = selected?._isSupport
    ? SUPPORT_CONV.other_user
    : selected?.other_user || selected?.userOne || selected?.userTwo;

  // Always prepend the system welcome message to every conversation
  const activeMessages = selected
    ? [SYSTEM_WELCOME, ...(selected._isSupport ? supportMessages : messages)]
    : [];

  // All convs including pinned Support
  const allConversations = [SUPPORT_CONV, ...conversations];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex items-center justify-center">
          <div className="animate-pulse flex gap-4">
            <div className="w-80 h-[500px] rounded-xl bg-gray-100" />
            <div className="flex-1 h-[500px] rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1 flex flex-col min-h-0">
        {!user ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500 mb-4">Sign in to use chat.</p>
            <Link
              to="/login"
              state={{ from: location }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-lg flex-1 flex min-h-0">

          {/* ── Conversation list (left panel) ─────────────────────────── */}
          <aside className={`
            w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-gray-50 shrink-0
            ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
          `}>
            <div className="px-4 py-3.5 border-b border-gray-200 bg-white">
              <h2 className="font-semibold text-gray-900 text-sm">Conversations</h2>
              <p className="text-xs text-gray-400 mt-0.5">{conversations.length} active</p>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {allConversations.map((c) => {
                const isSupport = c._isSupport;
                const other = isSupport
                  ? SUPPORT_CONV.other_user
                  : c.other_user || (c.user_one_id === user?.id ? c.userTwo : c.userOne);
                const isSelected = selected?.id === c.id;
                const count = isSupport ? 0 : (c.unread_count ?? unread[c.id] ?? 0);
                const isOnline = !isSupport && other && isSellerOnline(other);

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-m4m-purple text-white shadow-sm'
                        : 'hover:bg-white hover:shadow-sm text-gray-900'
                    }`}
                  >
                    <span className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden ${
                        isSelected ? 'bg-white/20 text-white' : isSupport ? 'bg-blue-100 text-blue-600' : 'bg-m4m-purple/10 text-m4m-purple'
                      }`}>
                        {isSupport ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        ) : other?.avatar ? (
                          <img
                            src={other.avatar}
                            alt={other.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          other?.name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      {isOnline && (
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                          isSelected ? 'bg-green-400 border-white' : 'bg-green-500 border-white'
                        }`} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {isSupport ? 'M4M Support' : other?.name || 'Conversation'}
                        </p>
                        {isSupport && (
                          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-m4m-purple'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                        {isSupport
                          ? 'Official support channel'
                          : c.product?.name
                            ? `Re: ${c.product.name}`
                            : c.messages_count != null
                              ? `${c.messages_count} message${c.messages_count !== 1 ? 's' : ''}`
                              : 'Chat'
                        }
                      </p>
                    </div>

                    {count > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Chat area (right panel) ────────────────────────────────── */}
          <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
            <ChatBox
              messages={activeMessages}
              currentUserId={user?.id}
              otherUser={otherUser}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSend={sendMessage}
              sending={sending}
              placeholder="Select a conversation"
              isTyping={isTyping}
              isSupport={selected?._isSupport}
              onBack={() => setMobileView('list')}
              inputDisabled={!selected?.id}
              onTyping={handleTyping}
              hasMoreMessages={hasMoreMessages}
              loadingOlderMessages={loadingOlderMessages}
              onLoadPrevious={loadPreviousMessages}
            />
          </div>
          </div>
        )}
      </div>
    </div>
    
  );
}
