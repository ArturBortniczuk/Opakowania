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

  // Jeśli użytkownik to pracownik, czat klienta nie jest dla niego (ma dedykowany panel w AdminNavbar)
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

          // Pobierz dotychczasowe wiadomości
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
        // Zapobieganie duplikatom
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Jeśli czat jest zamknięty i wiadomość jest od pracownika, zwiększ licznik
      if (newMsg.sender_role === 'staff') {
        if (!isOpen) {
          setUnreadCount((count) => count + 1);
        } else {
          // Oznacz jako przeczytane jeśli czat jest otwarty
          chatAPI.markMessagesAsRead(thread.id, 'client');
        }
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
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
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Przycisk Pływający (Floating Action Button) */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="relative group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 border border-blue-400/30"
          aria-label="Otwórz czat na żywo"
        >
          <MessageSquare className="w-6 h-6 animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-medium pr-1">
            Czat z obsługą
          </span>

          {/* Badge nieprzeczytanych wiadomości */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-md border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Okienko Czatu Klienta */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Nagłówek czatu */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-blue-600"></span>
              </div>
              <div>
                <h3 className="font-semibold text-base leading-snug">Wsparcie Grupy Eltron</h3>
                <p className="text-xs text-blue-100 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping mr-1"></span>
                  <span>Odpowiadamy w czasie rzeczywistym</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={toggleChat}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Zminimalizuj czat"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={toggleChat}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Zamknij czat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Obszar wiadomości */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 space-x-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-sm">Ładowanie rozmowy...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">Masz pytanie odnośnie bębnów?</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Napisz do nas wiadomość poniżej. Nasz specjalista ds. opakowań odpowie najszybciej jak to możliwe.
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
                      <span className="text-[11px] font-medium text-gray-500 ml-1 mb-0.5">
                        {msg.sender_name || 'Obsługa Klienta'}
                      </span>
                    )}
                    <div
                      className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        isMyMessage
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      <div
                        className={`flex items-center justify-end space-x-1 text-[10px] mt-1 ${
                          isMyMessage ? 'text-blue-200' : 'text-gray-400'
                        }`}
                      >
                        <span>{timeStr}</span>
                        {isMyMessage && <CheckCheck className="w-3 h-3 text-blue-200" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pole wpisywania wiadomości */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center space-x-2">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Wpisz treść wiadomości..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessageText.trim() || sending}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl shadow-md transition-all duration-200 flex items-center justify-center"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
