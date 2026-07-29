import { supabase } from '../lib/supabase';

export const chatAPI = {
  // Pobieranie lub tworzenie wątku dla zalogowanego klienta
  async getOrCreateClientThread(currentUser) {
    if (!currentUser || !currentUser.id) return null;

    try {
      // 1. Sprawdzamy czy istnieje otwarty wątek
      const { data: existingThreads, error: searchError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('client_user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (searchError) {
        console.error('Błąd pobierania wątku czatu:', searchError);
        throw searchError;
      }

      if (existingThreads && existingThreads.length > 0) {
        return existingThreads[0];
      }

      // 2. Jeśli nie istnieje, tworzymy nowy wątek
      const { data: newThread, error: createError } = await supabase
        .from('chat_threads')
        .insert([{
          client_user_id: currentUser.id,
          client_name: currentUser.name || currentUser.username || 'Klient',
          company_name: currentUser.companyName || currentUser.name || 'Firma',
          nip: currentUser.nip || '',
          status: 'open',
          unread_admin_count: 0,
          unread_client_count: 0
        }])
        .select()
        .single();

      if (createError) {
        console.error('Błąd tworzenia wątku czatu:', createError);
        throw createError;
      }

      return newThread;
    } catch (err) {
      console.error('Wystąpił błąd w getOrCreateClientThread:', err);
      return null;
    }
  },

  // Pobieranie wiadomości dla konkretnego wątku
  async getThreadMessages(threadId) {
    if (!threadId) return [];

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Błąd pobierania wiadomości:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Wyjątek w getThreadMessages:', err);
      return [];
    }
  },

  // Wysyłanie wiadomości
  async sendMessage({ threadId, senderId, senderRole, senderName, content }) {
    if (!threadId || !content || !content.trim()) return null;

    const trimmedContent = content.trim();

    try {
      // 1. Dodajemy wiadomość do chat_messages
      const { data: message, error: msgError } = await supabase
        .from('chat_messages')
        .insert([{
          thread_id: threadId,
          sender_id: senderId,
          sender_role: senderRole,
          sender_name: senderName,
          content: trimmedContent,
          is_read: false
        }])
        .select()
        .single();

      if (msgError) {
        console.error('Błąd wysyłania wiadomości:', msgError);
        throw msgError;
      }

      // 2. Aktualizujemy nagłówek wątku chat_threads
      const isClient = senderRole === 'client';
      const now = new Date().toISOString();

      const { data: threadData } = await supabase
        .from('chat_threads')
        .select('unread_admin_count, unread_client_count')
        .eq('id', threadId)
        .single();

      const updatePayload = {
        last_message: trimmedContent,
        last_message_at: now,
        updated_at: now
      };

      if (isClient) {
        updatePayload.unread_admin_count = ((threadData?.unread_admin_count || 0) + 1);
      } else {
        updatePayload.unread_client_count = ((threadData?.unread_client_count || 0) + 1);
      }

      await supabase
        .from('chat_threads')
        .update(updatePayload)
        .eq('id', threadId);

      return message;
    } catch (err) {
      console.error('Wyjątek w sendMessage:', err);
      return null;
    }
  },

  // Oznaczanie wiadomości w wątku jako przeczytane
  async markMessagesAsRead(threadId, readerRole) {
    if (!threadId) return;

    try {
      const targetSenderRole = readerRole === 'staff' ? 'client' : 'staff';

      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .eq('sender_role', targetSenderRole)
        .eq('is_read', false);

      const updatePayload = readerRole === 'staff' 
        ? { unread_admin_count: 0 }
        : { unread_client_count: 0 };

      await supabase
        .from('chat_threads')
        .update(updatePayload)
        .eq('id', threadId);
    } catch (err) {
      console.error('Błąd w markMessagesAsRead:', err);
    }
  },

  // Pobieranie wszystkich wątków (dla panelu admina)
  async getAllThreads() {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Błąd pobierania wątków czatu dla admina:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Wyjątek w getAllThreads:', err);
      return [];
    }
  },

  // Subskrypcja wiadomości w czasie rzeczywistym dla wybranego wątku (unikalna nazwa kanału zapobiega błędom)
  subscribeToThreadMessages(threadId, onNewMessage) {
    if (!threadId) return null;

    const channelName = `chat_thread_${threadId}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          if (payload.new && onNewMessage) {
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe();

    return channel;
  },

  // Subskrypcja zbiorcza dla admina (unikalna nazwa kanału zapobiega błędom)
  subscribeToStaffChat(onMessageOrThreadUpdate) {
    const channelName = `staff_global_chat_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (onMessageOrThreadUpdate) onMessageOrThreadUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_threads' },
        (payload) => {
          if (onMessageOrThreadUpdate) onMessageOrThreadUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  }
};
