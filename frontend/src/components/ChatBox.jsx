import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isSellerOnline } from '../lib/sellerOnline';

export default function ChatBox({
  messages = [],
  currentUserId,
  otherUser,
  newMessage,
  onNewMessageChange,
  onSend,
  sending = false,
  placeholder = 'Select a conversation',
  isTyping = false,
}) {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping]);

  if (!otherUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-m4m-gray-50 min-h-[400px]">
        <div className="w-20 h-20 rounded-full bg-m4m-gray-200 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-m4m-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-m4m-gray-500 font-medium">{placeholder}</p>
        <p className="text-sm text-m4m-gray-400 mt-1">Choose a conversation or start a new one</p>
      </div>
    );
  }

  const online = isSellerOnline(otherUser);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Header - marketplace-style chat header */}
      <div className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-m4m-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="relative shrink-0">
            <span className="w-12 h-12 rounded-full bg-m4m-purple text-white flex items-center justify-center text-lg font-bold ring-2 ring-white shadow-sm">
              {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
            {online && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"
                title="Online"
              />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-m4m-black truncate">{otherUser.name || 'Chat'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className={`text-xs flex items-center gap-1.5 ${online ? 'text-green-600' : 'text-m4m-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-m4m-gray-400'}`} />
                {online ? 'Online' : 'Offline'}
              </p>
              {otherUser?.id && (
                <Link
                  to={`/seller/${otherUser.id}`}
                  className="text-xs text-m4m-purple hover:underline"
                >
                  View profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 min-h-0 bg-m4m-gray-50/50"
      >
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-m4m-gray-500 text-sm">No messages yet</p>
            <p className="text-m4m-gray-400 text-sm mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((m) => {
              const isMine = m.sender?.id === currentUserId || m.user_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                        isMine
                          ? 'rounded-br-md bg-m4m-purple text-white'
                          : 'rounded-bl-md bg-white text-m4m-black border border-m4m-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                    </div>
                    <span className={`text-xs text-m4m-gray-400 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-m4m-gray-200 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-m4m-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-m4m-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-m4m-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input - modern send bar */}
      <div className="p-4 md:p-6 border-t border-m4m-gray-200 bg-white shrink-0">
        <div className="flex gap-3 items-end">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
            className="flex-1 px-4 py-3 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 text-m4m-black placeholder-m4m-gray-400 focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors"
            disabled={sending}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !newMessage.trim()}
            className="p-3 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 h-[46px] flex items-center justify-center"
          >
            {sending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
