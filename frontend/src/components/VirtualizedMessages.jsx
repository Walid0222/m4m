import React, { useMemo, useRef, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';

/**
 * VirtualizedMessages
 *
 * Renders chat messages using react-virtuoso with:
 * - variable-height rows
 * - date separators
 * - optional typing indicator row
 * - top "Show previous messages" button
 * - smart auto-scroll behavior (respecting user scroll position)
 */
export default function VirtualizedMessages({
  messages = [],
  hasMoreMessages = false,
  loadingOlderMessages = false,
  onLoadPrevious,
  isTyping = false,
  currentUserId,
  otherUser,
  isSupport = false,
  avatar,
}) {
  const virtuosoRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const lastMessageKeyRef = useRef(null);

  const systemMsgs = useMemo(
    () => messages.filter((m) => m._system),
    [messages]
  );
  const regularMsgs = useMemo(
    () => messages.filter((m) => !m._system),
    [messages]
  );

  // Group regular messages by formatted date
  const groupedMessages = useMemo(() => {
    return regularMsgs.reduce((groups, msg) => {
      const date = msg.created_at
        ? new Date(msg.created_at).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
        : null;
      if (!date) {
        if (groups.length > 0) {
          groups[groups.length - 1].msgs.push(msg);
        }
        return groups;
      }
      const last = groups[groups.length - 1];
      if (last?.date === date) {
        last.msgs.push(msg);
        return groups;
      }
      return [...groups, { date, msgs: [msg] }];
    }, []);
  }, [regularMsgs]);

  // Last message from the current user, to show status (sent / delivered / seen)
  const lastMyMsg = useMemo(() => {
    const copy = [...messages].reverse();
    const idx = copy.findIndex(
      (m) => m.user_id === currentUserId || m.sender?.id === currentUserId
    );
    return idx >= 0 ? copy[idx] : null;
  }, [messages, currentUserId]);

  // Flatten into a row model for Virtuoso
  const rows = useMemo(() => {
    const items = [];

    // Date groups and messages
    groupedMessages.forEach(({ date, msgs }, groupIdx) => {
      const headerKey = `date-${date}`;
      items.push({
        type: 'date',
        key: headerKey,
        date,
      });

      msgs.forEach((m, idx) => {
        const baseId = m.id ?? m._tempId;
        const messageKey =
          baseId != null ? `msg-${baseId}` : `msg-${groupIdx}-${idx}`;
        items.push({
          type: 'message',
          key: messageKey,
          message: m,
          groupIdx,
          msgIdx: idx,
          isLastInGroup:
            idx === msgs.length - 1 ||
            (msgs[idx + 1]?.user_id ?? msgs[idx + 1]?.sender?.id) !==
              (m.user_id ?? m.sender?.id),
        });
      });
    });

    if (isTyping) {
      items.push({
        type: 'typing',
        key: 'typing-row',
      });
    }

    return items;
  }, [groupedMessages, isTyping]);

  // Smart auto-scroll: when a new message arrives
  useEffect(() => {
    if (rows.length === 0) return;

    // Find the last message row (ignore typing row)
    let lastMessageIndex = -1;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i]?.type === 'message') {
        lastMessageIndex = i;
        break;
      }
    }
    if (lastMessageIndex === -1) return;

    const lastMessage = rows[lastMessageIndex].message;
    const lastId = lastMessage ? lastMessage.id ?? lastMessage._tempId : null;
    if (!lastId) return;
    const prevLastId = lastMessageKeyRef.current;
    const isNew = lastId && lastId !== prevLastId;
    lastMessageKeyRef.current = lastId;

    if (!isNew || !lastMessage) return;

    const isMine =
      lastMessage.user_id === currentUserId ||
      lastMessage.sender?.id === currentUserId;

    if (isMine || (isAtBottomRef.current && lastMessageIndex !== rows.length - 1)) {
      virtuosoRef.current?.scrollToIndex({
        index: lastMessageIndex,
        align: 'end',
        behavior: 'auto',
      });
    }
  }, [rows, currentUserId]);

  if (!otherUser) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50">
      {/* System welcome messages — always shown at top, outside virtualization */}
      {systemMsgs.map((m) => (
        <div key={m.id} className="flex justify-center mb-4">
          <div className="flex items-start gap-2 max-w-sm rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
            <svg
              className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">{m.body}</p>
          </div>
        </div>
      ))}

      {regularMsgs.length === 0 && !isTyping ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400">
            Send a message to start the conversation
          </p>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          className="flex-1"
          data={rows}
          followOutput="auto"
          overscan={60}
          components={{
            Header: () =>
              hasMoreMessages && onLoadPrevious ? (
                <div className="flex justify-center py-2">
                  <button
                    type="button"
                    onClick={onLoadPrevious}
                    disabled={loadingOlderMessages}
                    className="text-xs text-m4m-purple hover:underline disabled:opacity-50"
                  >
                    {loadingOlderMessages
                      ? 'Loading previous messages…'
                      : 'Show previous messages'}
                  </button>
                </div>
              ) : null,
            List: React.forwardRef((props, ref) => (
              // eslint-disable-next-line react/jsx-props-no-spreading
              <div {...props} ref={ref} className="px-4 py-4" />
            )),
          }}
          itemContent={(index, row) => {
            if (row.type === 'date') {
              return (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium px-2">
                    {row.date}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              );
            }

            if (row.type === 'typing') {
              return (
                <div className="flex justify-start ml-9">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-gray-200 shadow-sm">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // message row
            const m = row.message;
            const isMine =
              m.user_id === currentUserId || m.sender?.id === currentUserId;
            const isLastInGroup = row.isLastInGroup;
            const isPending = m._pending === true;
            const status = m.status;
            const isLastMyMsg = lastMyMsg?.id === m.id;

            const senderAvatar = m.sender?.avatar || otherUser?.avatar || null;

            return (
              <div
                className={`flex mb-1 ${
                  isMine ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Other user avatar — only on last in group */}
                {!isMine && isLastInGroup && (
                  <span className="w-7 h-7 rounded-full bg-m4m-purple text-white flex items-center justify-center text-xs font-bold mr-2 self-end mb-0.5 flex-shrink-0 overflow-hidden">
                    {senderAvatar ? (
                      <img
                        src={senderAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : isSupport ? (
                      '🛟'
                    ) : (
                      otherUser.name?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </span>
                )}
                {!isMine && !isLastInGroup && (
                  <span className="w-7 mr-2 flex-shrink-0" />
                )}

                <div
                  className={`flex flex-col max-w-[75%] ${
                    isMine ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMine
                        ? `rounded-br-sm ${
                            isPending
                              ? 'bg-m4m-purple/50 text-white'
                              : 'bg-m4m-purple text-white'
                          }`
                        : 'rounded-bl-sm bg-white text-gray-900 border border-gray-200 shadow-sm'
                    }`}
                  >
                    {m.body}
                  </div>
                  <div
                    className={`flex items-center gap-1.5 mt-0.5 ${
                      isMine ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="text-[10px] text-gray-400">
                      {m.created_at
                        ? new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : isPending
                          ? 'Sending…'
                          : ''}
                    </span>
                    {isMine && isLastMyMsg && (
                      <>
                        {isPending && (
                          <svg
                            className="w-3 h-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3"
                            />
                          </svg>
                        )}
                        {!isPending && status === 'seen' && (
                          <span className="text-[10px] text-blue-500 font-medium">
                            ✓✓
                          </span>
                        )}
                        {!isPending && status === 'delivered' && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            ✓✓
                          </span>
                        )}
                        {!isPending &&
                          (!status || status === 'sent') && (
                            <span className="text-[10px] text-gray-400 font-medium">
                              ✓
                            </span>
                          )}
                      </>
                    )}
                  </div>
                </div>

                {/* My avatar — only on last in group */}
                {isMine && isLastInGroup && (
                  <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold ml-2 self-end mb-0.5 flex-shrink-0 overflow-hidden">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      '👤'
                    )}
                  </span>
                )}
                {isMine && !isLastInGroup && (
                  <span className="w-7 ml-2 flex-shrink-0" />
                )}
              </div>
            );
          }}
          atBottomStateChange={(atBottom) => {
            isAtBottomRef.current = atBottom;
          }}
          rangeChanged={(range) => {
            const nearBottom = range.endIndex >= rows.length - 2;
            isAtBottomRef.current = nearBottom;
          }}
          computeItemKey={(_, row) => row.key}
        />
      )}
    </div>
  );
}

