import { useState, useEffect, useRef } from 'react';
import { getEcho } from '../echo';
import './ChatPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getToken() {
  return localStorage.getItem('m4m_token');
}

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const echoRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchConversations() {
      try {
        const res = await fetch(`${API_BASE}/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = data.data?.data ?? data.data ?? [];
        if (!cancelled) setConversations(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchConversations();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected?.id || !getToken()) return;
    let cancelled = false;
    async function fetchMessages() {
      try {
        const res = await fetch(`${API_BASE}/conversations/${selected.id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (!cancelled && data.data?.messages) {
          const list = data.data.messages.data ?? data.data.messages ?? [];
          setMessages(Array.isArray(list) ? [...list].reverse() : []);
        } else if (!cancelled) setMessages([]);
      } catch {
        if (!cancelled) setMessages([]);
      }
    }
    fetchMessages();
    return () => { cancelled = true; };
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id || !getToken()) return;

    try {
      const echo = getEcho();
      echoRef.current = echo;

      const channel = echo.private(`conversation.${selected.id}`);

      channel.listen('.message.sent', (payload) => {
        const msg = payload.message;
        if (!msg) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      return () => {
        channel.stopListening('.message.sent');
        echo.leave(`conversation.${selected.id}`);
      };
    } catch (err) {
      console.warn('Echo subscription failed:', err);
      return () => {};
    }
  }, [selected?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const otherUser = selected?.other_user || selected?.userOne || selected?.userTwo;
  const sendMessage = async () => {
    if (!newMessage.trim() || !selected?.id || sending) return;
    const token = getToken();
    if (!token) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/conversations/${selected.id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.data.id)) return prev;
          return [...prev, data.data];
        });
      }
      setNewMessage('');
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0)
    return <div className="page-loading">Loading conversations…</div>;

  return (
    <div className="chat-page">
      <h1>Chat</h1>
      {!getToken() ? (
        <p className="chat-auth-msg">Log in to use chat.</p>
      ) : (
        <div className="chat-layout">
          <aside className="chat-sidebar">
            <h2>Conversations</h2>
            {conversations.length === 0 ? (
              <p className="chat-empty">No conversations yet.</p>
            ) : (
              <ul className="chat-conv-list">
                {conversations.map((c) => {
                  const other = c.other_user || (c.user_one_id ? c.userTwo : c.userOne);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={`chat-conv-btn ${selected?.id === c.id ? 'active' : ''}`}
                        onClick={() => setSelected(c)}
                      >
                        {other?.name || 'Conversation'} {c.messages_count != null && `(${c.messages_count})`}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
          <div className="chat-main">
            {!selected ? (
              <div className="chat-placeholder">Select a conversation</div>
            ) : (
              <>
                <div className="chat-header">
                  <strong>{otherUser?.name || 'Chat'}</strong>
                  <span className="chat-realtime-badge">Live</span>
                </div>
                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <p className="chat-no-msg">No messages yet. Say hello!</p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`chat-msg ${m.sender?.id === otherUser?.id ? 'other' : 'mine'}`}
                      >
                        <span className="chat-msg-sender">{m.sender?.name}</span>
                        <p className="chat-msg-body">{m.body}</p>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="chat-input-row">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="chat-input"
                    disabled={sending}
                  />
                  <button type="button" onClick={sendMessage} className="chat-send" disabled={sending}>
                    {sending ? '…' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
