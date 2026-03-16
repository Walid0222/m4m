import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isSellerOnline } from '../lib/sellerOnline';
import { useAuth } from '../contexts/AuthContext';
import { VerifiedBadge, SellerSalesBadge } from './SellerBadges';

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
  isSupport = false,
  onBack,
  inputDisabled = false,
  onTyping,
  hasMoreMessages = false,
  loadingOlderMessages = false,
  onLoadPrevious,
}) {
  const { avatar } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // TEMP: debug ChatBox render and messages length
  // eslint-disable-next-line no-console
  console.log('[ChatBox] render, messages length =', messages.length);

  // Smart auto-scroll:
  // - When a new message arrives and user is near bottom, scroll to bottom.
  // - When the current user sends a message, always scroll to bottom.
  // - Do not force scroll if user has scrolled up and a remote message arrives.
  const lastMessageIdRef = useRef(null);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;

    const last = messages[messages.length - 1];
    const lastId = last ? (last.id ?? last._tempId) : null;
    const prevLastId = lastMessageIdRef.current;
    const isNew = lastId && lastId !== prevLastId;
    lastMessageIdRef.current = lastId;

    if (!isNew || !last) return;

    const isMine = last.user_id === currentUserId || last.sender?.id === currentUserId;

    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nearBottom = distanceFromBottom < 40;

    if (isMine || nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, currentUserId]);

  // Focus input when conversation is selected
  useEffect(() => {
    if (otherUser) inputRef.current?.focus();
  }, [otherUser?.id]);

  if (!otherUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 min-h-[400px] p-8">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium text-lg">{placeholder}</p>
        <p className="text-sm text-gray-400 mt-2">Choose a conversation from the left</p>
      </div>
    );
  }

  const online = isSellerOnline(otherUser);

  // Separate system messages from regular messages for grouping
  const systemMsgs = messages.filter((m) => m._system);
  const regularMsgs = messages.filter((m) => !m._system);

  // Group regular messages by date
  const groupedMessages = regularMsgs.reduce((groups, msg) => {
    const date = msg.created_at ? new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : null;
    if (!date) { if (groups.length > 0) groups[groups.length - 1].msgs.push(msg); return groups; }
    const last = groups[groups.length - 1];
    if (last?.date === date) { last.msgs.push(msg); return groups; }
    return [...groups, { date, msgs: [msg] }];
  }, []);

  // The last message from me, to show seen status
  const lastMyMsgIdx = [...messages].reverse().findIndex((m) => m.user_id === currentUserId || m.sender?.id === currentUserId);
  const lastMyMsg = lastMyMsgIdx >= 0 ? [...messages].reverse()[lastMyMsgIdx] : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        {/* Back button on mobile */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors -ml-1"
            aria-label="Back to conversations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <div className="relative shrink-0">
          <span className="w-10 h-10 rounded-full bg-m4m-purple text-white flex items-center justify-center text-sm font-bold overflow-hidden">
            {isSupport
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              : otherUser.name?.charAt(0)?.toUpperCase() || '?'
            }
          </span>
          {online && !isSupport && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
          )}
        </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold text-gray-900 truncate text-sm">
                {isSupport ? 'M4M Support' : otherUser.name || 'Chat'}
              </p>
              {isSupport && (
                <svg className="w-4 h-4 text-m4m-purple flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
              {!isSupport && (
                <>
                  {(otherUser.is_verified === true ||
                    otherUser.is_verified === 1 ||
                    otherUser.is_verified_seller === true ||
                    otherUser.is_verified_seller === 1) && <VerifiedBadge />}
                  <SellerSalesBadge
                    completedSales={otherUser.completed_sales ?? otherUser.completedSales ?? 0}
                  />
                  {typeof otherUser.seller_level === 'number' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                      Seller Level {otherUser.seller_level}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className={`text-xs flex items-center gap-1 mt-0.5 ${isSupport ? 'text-blue-600' : online ? 'text-green-600' : 'text-gray-400'}`}>
              {isSupport ? (
                'Official M4M support channel'
              ) : (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {online ? 'Online' : 'Offline'}
                </>
              )}
            </p>
          </div>
        {!isSupport && otherUser?.id && (
          <Link to={`/seller/${otherUser.id}`} className="text-xs text-m4m-purple font-medium px-2.5 py-1.5 rounded-lg hover:bg-purple-50 transition-colors flex-shrink-0">
            Profile
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0 bg-gray-50/50"
      >
        {hasMoreMessages && onLoadPrevious && (
          <div className="flex justify-center mb-2">
            <button
              type="button"
              onClick={onLoadPrevious}
              disabled={loadingOlderMessages}
              className="text-xs text-m4m-purple hover:underline disabled:opacity-50"
            >
              {loadingOlderMessages ? 'Loading previous messages…' : 'Show previous messages'}
            </button>
          </div>
        )}
        {/* System welcome messages — always shown at top */}
        {systemMsgs.map((m) => (
          <div key={m.id} className="flex justify-center mb-4">
            <div className="flex items-start gap-2 max-w-sm rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">{m.body}</p>
            </div>
          </div>
        ))}

        {regularMsgs.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {groupedMessages.map(({ date, msgs }, groupIdx) => (
              <div key={`${date}-${groupIdx}`}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium px-2">{date}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                {msgs.map((m, idx) => {
                  const isMine = m.user_id === currentUserId || m.sender?.id === currentUserId;
                  const isLastInGroup = idx === msgs.length - 1 || (msgs[idx + 1]?.user_id ?? msgs[idx + 1]?.sender?.id) !== (m.user_id ?? m.sender?.id);
                  const isPending = m._pending === true;
                  const status = m.status; // 'sent' | 'delivered' | 'seen'
                  const isSeen = (status === 'seen' || m.seen_at != null) && isMine;
                  const isLastMyMsg = lastMyMsg?.id === m.id;

                  return (
                    <div
                      key={m.id ?? m._tempId ?? idx}
                      className={`flex mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Other user avatar — only on last in group */}
                      {!isMine && isLastInGroup && (
                        <span className="w-7 h-7 rounded-full bg-m4m-purple text-white flex items-center justify-center text-xs font-bold mr-2 self-end mb-0.5 flex-shrink-0">
                          {isSupport ? '🛟' : otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                      {!isMine && !isLastInGroup && <span className="w-7 mr-2 flex-shrink-0" />}

                      <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                          isMine
                            ? `rounded-br-sm ${isPending ? 'bg-m4m-purple/50 text-white' : 'bg-m4m-purple text-white'}`
                            : 'rounded-bl-sm bg-white text-gray-900 border border-gray-200 shadow-sm'
                        }`}>
                          {m.body}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] text-gray-400">
                            {m.created_at
                              ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : isPending
                                ? 'Sending…'
                                : ''}
                          </span>
                          {isMine && isLastMyMsg && (
                            <>
                              {isPending && (
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                                </svg>
                              )}
                              {!isPending && status === 'seen' && (
                                <span className="text-[10px] text-blue-500 font-medium">✓✓</span>
                              )}
                              {!isPending && status === 'delivered' && status !== 'seen' && (
                                <span className="text-[10px] text-gray-400 font-medium">✓✓</span>
                              )}
                              {!isPending && (!status || status === 'sent') && (
                                <span className="text-[10px] text-gray-400 font-medium">✓</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* My avatar — only on last in group */}
                      {isMine && isLastInGroup && (
                        <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold ml-2 self-end mb-0.5 flex-shrink-0 overflow-hidden">
                          {avatar
                            ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                            : '👤'
                          }
                        </span>
                      )}
                      {isMine && !isLastInGroup && <span className="w-7 ml-2 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start ml-9">
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-gray-200 shadow-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="p-3 md:p-4 border-t border-gray-200 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              onNewMessageChange(e.target.value);
              // TEMP: debug typing from input
              // eslint-disable-next-line no-console
              console.log('User is typing');
              if (onTyping) onTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!inputDisabled) onSend();
              } else if (onTyping) {
                onTyping();
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors text-sm"
            disabled={sending || inputDisabled}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || inputDisabled || !newMessage.trim()}
            className="p-2.5 rounded-xl bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center"
            aria-label="Send message"
          >
            {sending
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
