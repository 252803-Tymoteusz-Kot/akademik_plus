import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// =========================================================================
//  Typy domenowe
// =========================================================================

export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  capacity: number;
  occupied: number;
  standard: 'basic' | 'standard' | 'premium';
  pricePerMonth: number;
  equipment: string[];
  status: 'available' | 'full' | 'maintenance';
  soleUse?: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
  phoneNumber: string;
  roomId: string | null;
  bedNumber: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'pending' | 'overdue';
  month: string;
  year: number;
}

export interface Issue {
  id: string;
  studentId: string;
  roomId: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'furniture' | 'heating' | 'other';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  resolvedAt: string | null;
}

export interface IssueMessage {
  id: string;
  issueId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'admin';
  message: string;
  timestamp: string;
}

export interface ResidenceHistory {
  id: string;
  studentId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'admin';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  studentId: string;
  studentName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  apiOnline: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  rooms: Room[];
  students: Student[];
  payments: Payment[];
  issues: Issue[];
  residenceHistory: ResidenceHistory[];
  chatMessages: ChatMessage[];
  conversations: Conversation[];
  issueMessages: IssueMessage[];
  addRoom: (room: Omit<Room, 'id'>) => Promise<void>;
  updateRoom: (id: string, room: Partial<Room>) => Promise<void>;
  assignStudentToRoom: (studentId: string, roomId: string, bedNumber: number) => Promise<void>;
  removeStudentFromRoom: (studentId: string) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  addIssue: (issue: Omit<Issue, 'id' | 'createdAt' | 'resolvedAt'>) => Promise<void>;
  updateIssue: (id: string, issue: Partial<Issue>) => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, student: Partial<Student>) => Promise<void>;
  sendMessage: (
    conversationId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'admin',
    message: string,
  ) => Promise<void>;
  markMessagesAsRead: (conversationId: string, userId: string) => Promise<void>;
  getOrCreateConversation: (studentId: string, studentName: string) => Promise<string>;
  addIssueMessage: (
    issueId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'admin',
    message: string,
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// =========================================================================
//  Drobny helper do wywołań API z ujednoliconą obsługą błędów
// =========================================================================

async function apiCall<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const resp = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${text || resp.statusText}`);
  }
  if (resp.status === 204) return undefined as unknown as T;
  return (await resp.json()) as T;
}

// =========================================================================
//  Provider
// =========================================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [residenceHistory, setResidenceHistory] = useState<ResidenceHistory[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [issueMessages, setIssueMessages] = useState<IssueMessage[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // ----- Pierwsze ładowanie ----------------------------------------------

  const loadInitialData = useCallback(async () => {
    try {
      const state = await apiCall<{
        rooms: Room[];
        students: Student[];
        payments: Payment[];
        issues: Issue[];
        residenceHistory: ResidenceHistory[];
        chatMessages: ChatMessage[];
        conversations: Conversation[];
        issueMessages: IssueMessage[];
      }>('/api/state');
      setRooms(state.rooms);
      setStudents(state.students);
      setPayments(state.payments);
      setIssues(state.issues);
      setResidenceHistory(state.residenceHistory);
      setChatMessages(state.chatMessages);
      setConversations(state.conversations);
      setIssueMessages(state.issueMessages);
      setApiOnline(true);
    } catch (err) {
      console.error('[AppContext] Nie udało się pobrać stanu z API:', err);
      setApiOnline(false);
    }
  }, []);

  // ----- Automatyczne logowanie po sesji cookie --------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiCall<{ authenticated: boolean; user?: User }>('/api/me');
        if (!cancelled && me.authenticated && me.user) setUser(me.user);
      } catch {
        // brak sesji — nic nie robimy, zostajemy na ekranie logowania
      } finally {
        await loadInitialData();
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadInitialData]);

  // ----- Połączenie Socket.IO --------------------------------------------

  useEffect(() => {
    // Nawiązujemy socket niezależnie od zalogowania – aktualizacje danych
    // potrzebne są nawet na publicznych ekranach (np. dashboard po loginie).
    const socket = io({
      // dzięki proxy w vite.config.ts oraz domyślnej ścieżce '/socket.io'
      // klient łączy się z backendem działającym na porcie 4000.
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setApiOnline(true));
    socket.on('disconnect', () => setApiOnline(false));

    socket.on('rooms:changed', (data: Room[]) => setRooms(data));
    socket.on('students:changed', (data: Student[]) => setStudents(data));
    socket.on('payments:changed', (data: Payment[]) => setPayments(data));
    socket.on('issues:changed', (data: Issue[]) => setIssues(data));
    socket.on('conversations:changed', (data: Conversation[]) => setConversations(data));

    socket.on('chat:new-message', (msg: ChatMessage) => {
      setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    socket.on('chat:read', ({ conversationId, readerId }: { conversationId: string; readerId: string }) => {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.conversationId === conversationId && m.senderId !== readerId ? { ...m, read: true } : m,
        ),
      );
    });
    socket.on('issue-messages:new', (msg: IssueMessage) => {
      setIssueMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // =====================================================================
  //  Auth
  // =====================================================================

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiCall<{ success: boolean; user?: User }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.success && data.user) {
        setUser(data.user);
        await loadInitialData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[AppContext] Login error:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiCall('/api/logout', { method: 'POST' });
    } catch {
      /* ignoruj */
    }
    setUser(null);
  };

  // =====================================================================
  //  Pokoje
  // =====================================================================

  const addRoom = async (room: Omit<Room, 'id'>) => {
    await apiCall('/api/rooms', { method: 'POST', body: JSON.stringify(room) });
  };
  const updateRoom = async (id: string, updated: Partial<Room>) => {
    await apiCall(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(updated) });
  };

  // =====================================================================
  //  Studenci
  // =====================================================================

  const addStudent = async (student: Omit<Student, 'id'>) => {
    await apiCall('/api/students', { method: 'POST', body: JSON.stringify(student) });
  };
  const updateStudent = async (id: string, updated: Partial<Student>) => {
    await apiCall(`/api/students/${id}`, { method: 'PATCH', body: JSON.stringify(updated) });
  };

  const assignStudentToRoom = async (studentId: string, roomId: string, bedNumber: number) => {
    await apiCall(`/api/students/${studentId}/assign-room`, {
      method: 'POST',
      body: JSON.stringify({ roomId, bedNumber }),
    });
  };
  const removeStudentFromRoom = async (studentId: string) => {
    await apiCall(`/api/students/${studentId}/remove-room`, { method: 'POST' });
  };

  // =====================================================================
  //  Płatności
  // =====================================================================

  const addPayment = async (payment: Omit<Payment, 'id'>) => {
    await apiCall('/api/payments', { method: 'POST', body: JSON.stringify(payment) });
  };
  const updatePayment = async (id: string, updated: Partial<Payment>) => {
    await apiCall(`/api/payments/${id}`, { method: 'PATCH', body: JSON.stringify(updated) });
  };

  // =====================================================================
  //  Zgłoszenia
  // =====================================================================

  const addIssue = async (issue: Omit<Issue, 'id' | 'createdAt' | 'resolvedAt'>) => {
    await apiCall('/api/issues', { method: 'POST', body: JSON.stringify(issue) });
  };
  const updateIssue = async (id: string, updated: Partial<Issue>) => {
    await apiCall(`/api/issues/${id}`, { method: 'PATCH', body: JSON.stringify(updated) });
  };

  const addIssueMessage = async (
    issueId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'admin',
    message: string,
  ) => {
    await apiCall(`/api/issues/${issueId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ senderId, senderName, senderRole, message }),
    });
  };

  // =====================================================================
  //  Czat
  // =====================================================================

  const getOrCreateConversation = async (studentId: string, studentName: string): Promise<string> => {
    // optymistycznie – jeśli mamy już lokalnie, zwracamy id od razu (i tak w tle
    // backend potwierdzi istnienie i wyemituje broadcast).
    const existing = conversations.find((c) => c.studentId === studentId);
    if (existing) return existing.id;

    const conv = await apiCall<Conversation>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ studentId, studentName }),
    });
    return conv.id;
  };

  const sendMessage = async (
    conversationId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'admin',
    message: string,
  ) => {
    await apiCall('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, senderId, senderName, senderRole, message }),
    });
  };

  const markMessagesAsRead = async (conversationId: string, userId: string) => {
    await apiCall(`/api/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  };

  // =====================================================================

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        apiOnline,
        login,
        logout,
        rooms,
        students,
        payments,
        issues,
        residenceHistory,
        chatMessages,
        conversations,
        issueMessages,
        addRoom,
        updateRoom,
        assignStudentToRoom,
        removeStudentFromRoom,
        addPayment,
        updatePayment,
        addIssue,
        updateIssue,
        addStudent,
        updateStudent,
        sendMessage,
        markMessagesAsRead,
        getOrCreateConversation,
        addIssueMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
