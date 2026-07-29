import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Minus, Headphones, CheckCheck, Loader2 } from 'lucide-react';
import { chatAPI } from '../utils/chatApi';

const ChatWidget = ({ currentUser, isUserStaff }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Tylko dla klientów (dla pracowników czat jest w nawigacji)
  const isClient = currentUser && !isUserStaff;

  // Inicjalizacja wątku klienta
  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;

    const initChat = async () => {
      setLoading(true);
      try {
        const clientThread = await chatAPI.getOrCreateClientThread(currentUser);
        if (isMounted && clientThread) {
          setThread(clientThread);
          setUnreadCount(clientThread.unread_client_count || 0);

          const history = await chatAPI.getThreadMessages(clientThread.id);
          if (isMounted) {
            setMessages(history);
          }
        }
      } catch (err) {
        console.error('Błąd inicjalizacji czatu klienta:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
    };
  }, [currentUser, isClient]);

  // Subskrypcja wiadomości w czasie rzeczywistym
  useEffect(() => {
    if (!thread || !thread.id || !isClient) return;

    const subscription = chatAPI.subscribeToThreadMessages(thread.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (newMsg.sender_role === 'staff') {
        if (!isOpen) {
          setUnreadCount((count) => count + 1);
        } else {
          chatAPI.markMessagesAsRead(thread.id, 'client');
        }
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe();
        } catch (_) {}
      }
    };
  }, [thread, isOpen, isClient]);

  // Auto-scroll do najnowszej wiadomości
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Otwieranie / zamykanie czatu
  const toggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && thread) {
      setUnreadCount(0);
      chatAPI.markMessagesAsRead(thread.id, 'client');
    }
  };

  // Wysyłanie wiadomości
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !thread || sending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    try {
      const sentMsg = await chatAPI.sendMessage({
        threadId: thread.id,
        senderId: currentUser.id,
        senderRole: 'client',
        senderName: currentUser.name || currentUser.username || 'Klient',
        content: textToSend,
      });

      if (sentMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      console.error('Błąd podczas wysyłania wiadomości:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isClient) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Przycisk Dymku w prawym dolnym rogu (Zółty, okrągły jak na screenie) */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="relative group w-14 h-14 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-gray-900 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center border-2 border-amber-300/60 focus:outline-none"
          aria-label="Czat online"
        >
          <MessageSquare className="w-7 h-7 text-gray-950 fill-gray-950/20" />

          {/* Badge nieprzeczytanych wiadomości */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-lg border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Okienko Czatu prosto nad dymkiem bez formularzy */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Żółty nagłówek z tytułem "Chat online" */}
          <div className="bg-amber-400 text-gray-950 px-4 py-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-gray-950">Chat online</h3>
                <p className="text-[11px] text-gray-800 font-medium">Grupa Eltron — Obsługa klienta</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={toggleChat}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors text-gray-950"
                title="Zminimalizuj czat"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={toggleChat}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors text-gray-950"
                title="Zamknij czat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Obszar wiadomości — Od razu po otwarciu bezpośredni komunikator */}
          <div className="flex-1 p-3.5 overflow-y-auto bg-gray-50 space-y-3">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 space-x-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Łączenie z czatem...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-3 shadow-inner">
                  <Headphones className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Cześć! W czym możemy pomóc?</h4>
                <p className="text-xs text-gray-600 leading-relaxed max-w-[260px]">
                  Napisz wiadomość poniżej — nasz zespół odpowie w czasie rzeczywistym.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMyMessage = msg.sender_role === 'client';
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={msg.id || msg.created_at}
                    className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                  >
                    {!isMyMessage && (
                      <span className="text-[11px] font-semibold text-gray-600 ml-1 mb-0.5">
                        {msg.sender_name || 'Obsługa Klienta'}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs shadow-sm ${
                        isMyMessage
                          ? 'bg-amber-400 text-gray-950 font-medium rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      <div
                        className={`flex items-center justify-end space-x-1 text-[9px] mt-1 ${
                          isMyMessage ? 'text-gray-800' : 'text-gray-400'
                        }`}
                      >
                        <span>{timeStr}</span>
                        {isMyMessage && <CheckCheck className="w-3 h-3 text-gray-800" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Dolne pole tekstowe do natychmiastowego wysłania */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-gray-200 flex items-center space-x-2">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Napisz wiadomość..."
              className="flex-1 px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
              disabled={sending}
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessageText.trim() || sending}
              className="p-2 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-gray-950 rounded-xl shadow transition-all duration-200 flex items-center justify-center"
            >
              {sending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
