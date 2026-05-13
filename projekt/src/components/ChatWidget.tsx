import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    user,
    chatMessages,
    conversations,
    sendMessage,
    markMessagesAsRead,
    getOrCreateConversation,
  } = useApp();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, selectedConversationId]);

  useEffect(() => {
    if (selectedConversationId && user && isOpen) {
      markMessagesAsRead(selectedConversationId, user.id).catch(() => {
      });
    }

  }, [selectedConversationId, user, isOpen, chatMessages.length]);

  useEffect(() => {
    if (isOpen && user?.role === 'student' && !selectedConversationId) {
      getOrCreateConversation(user.id, user.name)
        .then((convId) => setSelectedConversationId(convId))
        .catch((err) => {
          console.error('Nie udało się otworzyć konwersacji:', err);
          toast.error('Nie udało się połączyć z czatem');
        });
    }
  }, [isOpen, user]);

  const handleSend = async () => {
    if (!message.trim() || !user || sending) return;

    let convId = selectedConversationId;
    if (user.role === 'student') {
      try {
        convId = await getOrCreateConversation(user.id, user.name);
        setSelectedConversationId(convId);
      } catch (err) {
        toast.error('Nie udało się utworzyć konwersacji');
        return;
      }
    }

    if (!convId) {
      toast.error('Wybierz konwersację');
      return;
    }

    const text = message.trim();
    setMessage('');
    setSending(true);
    try {
      await sendMessage(convId, user.id, user.name, user.role, text);
    } catch (err) {
      console.error('Wysłanie wiadomości nie powiodło się:', err);
      toast.error('Nie udało się wysłać wiadomości');
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

  const getCurrentMessages = () => {
    if (!selectedConversationId) return [];
    return chatMessages
      .filter((msg) => msg.conversationId === selectedConversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getUnreadCount = () => {
    if (!user) return 0;
    if (user.role === 'admin') {
      return conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    }
    if (isOpen) return 0;
    return chatMessages.filter(
      (m) => m.senderRole === 'admin' && m.senderId !== user.id && !m.read,
    ).length;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const currentMessages = getCurrentMessages();
  const unreadCount = getUnreadCount();

  // ----- Widok studenta ---------------------------------------------------

  const renderStudentChat = () => (
    <>
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Czat z administracją</h3>
            <p className="text-xs opacity-90">Administrator online</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 rounded-full p-1 transition-colors"
          aria-label="Zamknij czat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="h-96 p-4 space-y-3">
        {currentMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Rozpocznij rozmowę z administratorem</p>
            <p className="text-xs mt-1">Możesz zgłaszać problemy i zadawać pytania</p>
          </div>
        ) : (
          <>
            {currentMessages.map((msg) => {
              const isOwnMessage = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isOwnMessage ? 'bg-blue-600 text-white' : 'bg-muted'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
                    )}
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-muted-foreground'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            placeholder="Napisz wiadomość..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
          />
          <Button onClick={handleSend} size="icon" disabled={sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  // ----- Widok admina -----------------------------------------------------

  const renderAdminChat = () => {
    if (!selectedConversationId) {
      return (
        <>
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">Wiadomości od studentów</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Zamknij czat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ScrollArea className="h-96">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Brak wiadomości</p>
                <p className="text-xs mt-1">Gdy studenci napiszą, zobaczysz je tutaj</p>
              </div>
            ) : (
              <div className="divide-y">
                {[...conversations]
                  .sort(
                    (a, b) =>
                      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
                  )
                  .map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conv.id)}
                      className="w-full text-left p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{conv.studentName}</p>
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-red-500 hover:bg-red-600 text-xs px-1.5 py-0">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conv.lastMessage || 'Brak wiadomości'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(conv.lastMessageTime)}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </ScrollArea>
        </>
      );
    }

    const currentConv = conversations.find((c) => c.id === selectedConversationId);

    return (
      <>
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedConversationId(null)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
              aria-label="Wróć do listy"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{currentConv?.studentName}</h3>
              <p className="text-xs opacity-90">Student</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
            aria-label="Zamknij czat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ScrollArea className="h-96 p-4 space-y-3">
          {currentMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Brak wiadomości</p>
            </div>
          ) : (
            <>
              {currentMessages.map((msg) => {
                const isOwnMessage = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwnMessage ? 'bg-purple-600 text-white' : 'bg-muted'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-purple-100' : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              placeholder="Napisz wiadomość..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <Button onClick={handleSend} size="icon" disabled={sending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </>
    );
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform ${
            user.role === 'admin'
              ? 'bg-gradient-to-br from-purple-600 to-pink-600'
              : 'bg-gradient-to-br from-blue-600 to-purple-600'
          }`}
          aria-label="Otwórz czat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-xs w-5 h-5 flex items-center justify-center p-0 rounded-full">
              {unreadCount}
            </Badge>
          )}
        </button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm sm:max-w-md shadow-2xl overflow-hidden">
          {user.role === 'student' ? renderStudentChat() : renderAdminChat()}
        </Card>
      )}
    </>
  );
}
