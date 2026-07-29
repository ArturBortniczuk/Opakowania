import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Search, CheckCheck, Loader2, Building2, User, RefreshCw, BellRing } from 'lucide-react';
import { chatAPI } from '../utils/chatApi';

const AdminChatModal = ({ isOpen, onClose, currentUser }) => {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unread'

  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Pobieranie wszystkich wątków dla admina (tylko z niepustą ostatnią wiadomością)
  const fetchThreads = async () => {
    setLoadingThreads(true);
    try {
      const data = await chatAPI.getAllThreads();
      setThreads(data);
      
      // Jeśli żaden wątek nie jest wybrany, a lista nie jest pusta, wybierz pierwszy
      if (data.length > 0 && !selectedThread) {
        setSelectedThread(data[0]);
      }
    } catch (err) {
      console.error('Błąd pobierania listy wątków:', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchThreads();
    }
  }, [isOpen]);

  // Subskrypcja globalna czatu dla admina (odświeża wątki i wiadomości na żywo)
  useEffect(() => {
    if (!isOpen) return;

    const subscription = chatAPI.subscribeToStaffChat((payload) => {
      fetchThreads();

      if (payload.table === 'chat_messages' && payload.new) {
        const newMsg = payload.new;
        if (selectedThread && newMsg.thread_id === selectedThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          chatAPI.markMessagesAsRead(selectedThread.id, 'staff');
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
  }, [isOpen, selectedThread]);

  // Pobieranie wiadomości dla wybranego wątku
  useEffect(() => {
    if (!selectedThread) return;

    let isMounted = true;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const history = await chatAPI.getThreadMessages(selectedThread.id);
        if (isMounted) {
          setMessages(history);
          chatAPI.markMessagesAsRead(selectedThread.id, 'staff');
        }
      } catch (err) {
        console.error('Błąd pobierania wiadomości wątku:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedThread]);

  // Auto-scroll do dołu
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Wysyłanie wiadomości przez admina
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedThread || sending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    try {
      const sentMsg = await chatAPI.sendMessage({
        threadId: selectedThread.id,
        senderId: currentUser.id,
        senderRole: 'staff',
        senderName: currentUser.name || currentUser.username || 'Obsługa Klienta',
        content: textToSend,
      });

      if (sentMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
        fetchThreads();
      }
    } catch (err) {
      console.error('Błąd wysyłania wiadomości przez admina:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  // Filtrowanie wątków
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      (t.company_name && t.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.client_name && t.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.nip && t.nip.includes(searchQuery));

    if (activeFilter === 'unread') {
      return matchesSearch && (t.unread_admin_count > 0);
    }

    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Nagłówek okna czatu admina */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-xl">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Centrum Komunikacji z Klientami</span>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-0.5 rounded-full border border-blue-400/30 font-medium">
                  Realtime
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Obsługa zapytań i konwersacji w czasie rzeczywistym</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchThreads}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Odśwież wątki"
            >
              <RefreshCw className={`w-5 h-5 ${loadingThreads ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Zamknij"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Ciało okna: Podział na listę wątków (lewa strona) i okno rozmowy (prawa strona) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Lewy panel: Lista rozmów */}
          <div className="w-80 sm:w-96 border-r border-gray-200 bg-slate-50 flex flex-col shrink-0">
            {/* Wyszukiwarka i filtry */}
            <div className="p-3 border-b border-gray-200 bg-white space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj firmy, klienta lub NIP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex space-x-1.5">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-blue-100 text-blue-800 font-bold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Wszystkie ({threads.length})
                </button>
                <button
                  onClick={() => setActiveFilter('unread')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                    activeFilter === 'unread'
                      ? 'bg-blue-100 text-blue-800 font-bold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Nieprzeczytane ({threads.filter((t) => t.unread_admin_count > 0).length})</span>
                </button>
              </div>
            </div>

            {/* Lista wątków */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loadingThreads ? (
                <div className="p-6 text-center text-gray-400 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs">Wczytywanie rozmów...</span>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-xs">
                  Brak aktywnych konwersacji spełniających kryteria.
                </div>
              ) : (
                filteredThreads.map((t) => {
                  const isSelected = selectedThread && selectedThread.id === t.id;
                  const hasUnread = t.unread_admin_count > 0;
                  const lastTime = t.last_message_at
                    ? new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedThread(t);
                        chatAPI.markMessagesAsRead(t.id, 'staff');
                      }}
                      className={`w-full text-left p-3.5 transition-all duration-150 flex items-start space-x-3 relative ${
                        isSelected
                          ? 'bg-blue-50/90 border-l-4 border-blue-600 shadow-sm'
                          : 'hover:bg-white bg-slate-50/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-inner mt-0.5">
                        {t.company_name ? t.company_name.charAt(0).toUpperCase() : 'K'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-xs text-gray-900 truncate pr-1">
                            {t.company_name || t.client_name || 'Klient'}
                          </h4>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">{lastTime}</span>
                        </div>

                        <p className="text-[11px] text-gray-500 truncate flex items-center space-x-1 mb-1">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{t.client_name}</span>
                          {t.nip && <span className="text-gray-400 font-mono">({t.nip})</span>}
                        </p>

                        {t.last_message && (
                          <p className="text-xs text-gray-600 truncate italic font-sans bg-white/60 p-1 rounded border border-gray-100">
                            "{t.last_message}"
                          </p>
                        )}
                      </div>

                      {hasUnread && (
                        <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse self-center">
                          {t.unread_admin_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Prawy panel: Okno konwersacji */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {selectedThread ? (
              <>
                {/* Estetyczny Nagłówek wątku */}
                <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className="font-bold text-sm text-gray-900 truncate max-w-md">
                          {selectedThread.company_name || 'Klient'}
                        </h3>
                        {selectedThread.nip && (
                          <span className="text-[11px] font-semibold text-gray-700 bg-gray-200/80 px-2 py-0.5 rounded-md font-mono flex-shrink-0">
                            NIP: {selectedThread.nip}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Rozmówca: <strong className="text-gray-800">{selectedThread.client_name}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs flex-shrink-0">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200 flex items-center space-x-1.5 shadow-sm">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span>Aktywny wątek</span>
                    </span>
                  </div>
                </div>

                {/* Lista wiadomości */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-4">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-gray-400 space-x-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-xs">Ładowanie wiadomości...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                      Brak wiadomości w tym wątku.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isStaffMsg = msg.sender_role === 'staff';
                      const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={msg.id || msg.created_at}
                          className={`flex flex-col ${isStaffMsg ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[11px] font-semibold text-gray-500 mb-0.5 px-1">
                            {isStaffMsg ? (msg.sender_name || 'Administrator') : selectedThread.client_name}
                          </span>

                          <div
                            className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                              isStaffMsg
                                ? 'bg-blue-600 text-white rounded-br-none font-normal'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                            <div
                              className={`flex items-center justify-end space-x-1 text-[10px] mt-1 ${
                                isStaffMsg ? 'text-blue-100' : 'text-gray-400'
                              }`}
                            >
                              <span>{timeStr}</span>
                              {isStaffMsg && <CheckCheck className="w-3.5 h-3.5 text-blue-100" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Formularz odpowiedzi */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex items-center space-x-3 shrink-0">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Wpisz odpowiedź do klienta..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessageText.trim() || sending}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold text-sm shadow-md transition-all duration-200 flex items-center space-x-2"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Wyślij</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
                <h4 className="font-semibold text-gray-600 text-sm">Wybierz konwersację</h4>
                <p className="text-xs text-gray-400">Kliknij na wątek klienta po lewej stronie, aby otworzyć czat.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatModal;
