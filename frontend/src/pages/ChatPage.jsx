import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getEcho } from '../echo';
import {
  getConversations,
  getConversation,
  sendMessage as apiSendMessage,
  paginatedItems,
  getToken,
} from '../services/api';
import ChatBox from '../components/ChatBox';

export default function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState({});
  const selectedIdRef = useRef(null);
  const channelsRef = useRef({});

  selectedIdRef.current = selected?.id;

  const refreshConversations = useCallback(async () => {
    if (!getToken()) return;
    try {
      const result = await getConversations();
      setConversations(paginatedItems(result));
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
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

  const conversationIdFromUrl = searchParams.get('conversation');
  useEffect(() => {
    if (!conversationIdFromUrl || conversations.length === 0) return;
    const id = Number(conversationIdFromUrl);
    const conv = conversations.find((c) => c.id === id);
    if (conv) setSelected((s) => (s?.id === id ? s : conv));
  }, [conversationIdFromUrl, conversations]);

  useEffect(() => {
    if (!selected?.id || !getToken()) return;
    setUnread((prev) => ({ ...prev, [selected.id]: 0 }));
    let cancelled = false;
    (async () => {
      try {
        const data = await getConversation(selected.id);
        const msgPaginator = data?.messages;
        const list = msgPaginator ? paginatedItems(msgPaginator) : [];
        if (!cancelled) setMessages(Array.isArray(list) ? [...list].reverse() : []);
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selected?.id]);

  // Auto-refresh messages every 15s for selected conversation
  useEffect(() => {
    if (!selected?.id || !getToken()) return;
    const interval = setInterval(async () => {
      try {
        const data = await getConversation(selected.id);
        const msgPaginator = data?.messages;
        const list = msgPaginator ? paginatedItems(msgPaginator) : [];
        if (Array.isArray(list)) setMessages([...list].reverse());
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  // Subscribe to all conversation channels for real-time messages + unread
  useEffect(() => {
    if (!user?.id || !getToken() || conversations.length === 0) return;
    try {
      const echo = getEcho();
      const current = channelsRef.current;
      conversations.forEach((c) => {
        const key = `conversation.${c.id}`;
        if (current[key]) return;
        const channel = echo.private(key);
        current[key] = channel;
        channel.listen('.message.sent', (payload) => {
          const msg = payload.message;
          if (!msg) return;
          const convId = c.id;
          const isFromMe = msg.user_id === user.id;
          if (convId === selectedIdRef.current) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          } else if (!isFromMe) {
            setUnread((prev) => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
          }
        });
      });
      return () => {
        Object.keys(current).forEach((k) => {
          echo.leave(k);
          delete current[k];
        });
      };
    } catch (err) {
      console.warn('Echo subscription failed:', err);
      return () => {};
    }
  }, [user?.id, conversations]);

  const otherUser = selected?.other_user || selected?.userOne || selected?.userTwo;

  const sendMessage = async () => {
    if (!newMessage.trim() || !selected?.id || sending) return;
    if (!getToken()) return;
    setSending(true);
    try {
      const message = await apiSendMessage(selected.id, newMessage.trim());
      if (message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      setNewMessage('');
      refreshConversations();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse flex gap-4">
          <div className="w-80 h-[500px] rounded-xl bg-m4m-gray-100" />
          <div className="flex-1 h-[500px] rounded-xl bg-m4m-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-m4m-black mb-6">Messages</h1>

      {!user ? (
        <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-m4m-gray-500 mb-4">Log in to use chat.</p>
          <Link
            to="/login"
            state={{ from: location }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light transition-colors"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-m4m-gray-200 overflow-hidden bg-white shadow-lg flex flex-col md:flex-row min-h-[560px]">
          {/* Conversation list */}
          <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-m4m-gray-200 flex flex-col bg-m4m-gray-50 shrink-0">
            <div className="p-4 border-b border-m4m-gray-200 bg-white">
              <h2 className="font-semibold text-m4m-black">Conversations</h2>
              <p className="text-sm text-m4m-gray-500 mt-0.5">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-m4m-gray-500">No conversations yet.</p>
                  <p className="text-xs text-m4m-gray-400 mt-1">Start a conversation from a product or order.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {conversations.map((c) => {
                    const other = c.other_user || (c.user_one_id === user?.id ? c.userTwo : c.userOne);
                    const isSelected = selected?.id === c.id;
                    const count = unread[c.id] || 0;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(c)}
                          className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${
                            isSelected
                              ? 'bg-m4m-purple text-white shadow-sm'
                              : 'hover:bg-white hover:shadow-sm text-m4m-black'
                          }`}
                        >
                          <span className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-m4m-purple/20 text-m4m-purple'
                            }`}
                          >
                            {other?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium truncate ${isSelected ? 'text-white' : 'text-m4m-black'}`}>
                              {other?.name || 'Conversation'}
                            </p>
                            <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-m4m-gray-500'}`}>
                              {c.messages_count != null ? `${c.messages_count} message${c.messages_count !== 1 ? 's' : ''}` : 'Chat'}
                            </p>
                          </div>
                          {count > 0 && (
                            <span className="shrink-0 min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <ChatBox
              messages={messages}
              currentUserId={user?.id}
              otherUser={otherUser}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSend={sendMessage}
              sending={sending}
              placeholder="Select a conversation"
            />
          </div>
        </div>
      )}
    </div>
  );
}
