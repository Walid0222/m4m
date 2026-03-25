import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isSellerOnline } from '../lib/sellerOnline';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { VerifiedBadge, SellerSalesBadge } from './SellerBadges';
import VirtualizedMessages from './VirtualizedMessages';

export default function ChatBox({
  messages = [],
  currentUserId,
  otherUser,
  newMessage,
  onNewMessageChange,
  onSend,
  sending = false,
  placeholder,
  isTyping = false,
  isSupport = false,
  onBack,
  inputDisabled = false,
  onTyping,
  hasMoreMessages = false,
  loadingOlderMessages = false,
  onLoadPrevious,
  pendingProduct = null,
  onSendProduct,
  onDismissPendingProduct,
}) {
  const { avatar } = useAuth();
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const placeholderText = placeholder ?? t('chat.select_conversation');

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
        <p className="text-gray-500 font-medium text-lg">{placeholderText}</p>
        <p className="text-sm text-gray-400 mt-2">{t('chat.choose_conversation')}</p>
      </div>
    );
  }

  const online = isSellerOnline(otherUser);
  const hasSellerLevel = typeof otherUser?.seller_level === 'number' && otherUser.seller_level > 0;
  const roleLabel = hasSellerLevel ? `Level ${otherUser.seller_level}` : 'Buyer';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        {/* Back button on mobile */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors -ml-1"
            aria-label={t('chat.back_to_conversations')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-m4m-purple text-white flex items-center justify-center font-semibold overflow-hidden">
            {isSupport ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : otherUser?.avatar ? (
              <img
                src={otherUser.avatar}
                alt={otherUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              otherUser?.name?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
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
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                    {roleLabel}
                  </span>
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

      {/* Messages area (virtualized) */}
      <div className="flex-1 min-h-0">
        <VirtualizedMessages
          messages={messages}
          hasMoreMessages={hasMoreMessages}
          loadingOlderMessages={loadingOlderMessages}
          onLoadPrevious={onLoadPrevious}
          isTyping={isTyping}
          currentUserId={currentUserId}
          otherUser={otherUser}
          isSupport={isSupport}
          avatar={avatar}
        />
      </div>

      {/* Input bar */}
      <div className="p-3 md:p-4 border-t border-gray-200 bg-white shrink-0">
        {pendingProduct && !isSupport && onSendProduct && onDismissPendingProduct && (
          <div className="mb-3 flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-200">
              {pendingProduct.image ? (
                <img src={pendingProduct.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{pendingProduct.name}</p>
              <p className="text-xs text-gray-500">
                {pendingProduct.price != null ? `${Number(pendingProduct.price).toFixed(2)} MAD` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSendProduct(pendingProduct.id)}
                  disabled={sending}
                  className="rounded-lg bg-m4m-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-m4m-purple-dark disabled:opacity-50"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={onDismissPendingProduct}
                  disabled={sending}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            type="text"
            placeholder={t('chat.placeholder_message')}
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
            aria-label={t('chat.aria_send')}
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
