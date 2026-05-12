import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Wrench, Zap, Armchair, Thermometer, HelpCircle, Clock, AlertTriangle, CheckCircle2, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export function AdminIssues() {
  const { issues, students, rooms, updateIssue, user, issueMessages, addIssueMessage } = useApp();
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in-progress' | 'resolved' | 'closed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleStatusChange = async (issueId: string, newStatus: 'open' | 'in-progress' | 'resolved' | 'closed') => {
    try {
      await updateIssue(issueId, { status: newStatus });
      toast.success('Status zgłoszenia został zaktualizowany');
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się zaktualizować statusu');
    }
  };

  const handleSendMessage = async (issueId: string) => {
    const message = messageInputs[issueId]?.trim();
    if (!message || !user) return;

    const prevInputs = messageInputs;
    setMessageInputs({ ...messageInputs, [issueId]: '' });
    try {
      await addIssueMessage(issueId, user.id, user.name, user.role, message);
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się wysłać wiadomości');
      setMessageInputs(prevInputs);
    }
  };

  const getIssueMessages = (issueId: string) => {
    return issueMessages
      .filter(msg => msg.issueId === issueId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (expandedIssue && messagesEndRefs.current[expandedIssue]) {
      messagesEndRefs.current[expandedIssue]?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [issueMessages, expandedIssue]);

  const getStudent = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getRoom = (roomId: string) => {
    return rooms.find(r => r.id === roomId);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'plumbing':
        return <Wrench className="w-4 h-4" />;
      case 'electrical':
        return <Zap className="w-4 h-4" />;
      case 'furniture':
        return <Armchair className="w-4 h-4" />;
      case 'heating':
        return <Thermometer className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'plumbing':
        return 'Hydraulika';
      case 'electrical':
        return 'Elektryka';
      case 'furniture':
        return 'Meble';
      case 'heating':
        return 'Ogrzewanie';
      default:
        return 'Inne';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Otwarte
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            W trakcie
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Rozwiązane
          </Badge>
        );
      case 'closed':
        return <Badge variant="outline">Zamknięte</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case 'high':
        return <Badge variant="destructive">Wysoki</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Średni</Badge>;
      case 'low':
        return <Badge variant="outline">Niski</Badge>;
      default:
        return <Badge>{pri}</Badge>;
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (filterStatus !== 'all' && issue.status !== filterStatus) return false;
    if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
    return true;
  }).sort((a, b) => {
    // Sort by priority (high first) then by date (newest first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const openIssues = issues.filter(i => i.status === 'open').length;
  const inProgressIssues = issues.filter(i => i.status === 'in-progress').length;
  const resolvedIssues = issues.filter(i => i.status === 'resolved').length;
  const highPriorityIssues = issues.filter(i => i.priority === 'high' && i.status !== 'closed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Zarządzanie zgłoszeniami</h1>
        <p className="text-muted-foreground mt-2">Przeglądaj i rozwiązuj zgłoszenia techniczne</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Otwarte</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{openIssues}</div>
            <p className="text-xs text-muted-foreground">wymagają przypisania</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">W trakcie</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressIssues}</div>
            <p className="text-xs text-muted-foreground">w realizacji</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rozwiązane</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedIssues}</div>
            <p className="text-xs text-muted-foreground">zakończone</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wysoki priorytet</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highPriorityIssues}</div>
            <p className="text-xs text-muted-foreground">pilne</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista zgłoszeń</CardTitle>
              <CardDescription>Wszystkie zgłoszenia techniczne od mieszkańców</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue>{filterStatus === 'all' ? 'Wszystkie' : filterStatus === 'open' ? 'Otwarte' : filterStatus === 'in-progress' ? 'W trakcie' : filterStatus === 'resolved' ? 'Rozwiązane' : 'Zamknięte'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="open">Otwarte</SelectItem>
                  <SelectItem value="in-progress">W trakcie</SelectItem>
                  <SelectItem value="resolved">Rozwiązane</SelectItem>
                  <SelectItem value="closed">Zamknięte</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={(v: any) => setFilterPriority(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue>{filterPriority === 'all' ? 'Wszystkie' : filterPriority === 'low' ? 'Niski' : filterPriority === 'medium' ? 'Średni' : 'Wysoki'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie priorytety</SelectItem>
                  <SelectItem value="high">Wysoki</SelectItem>
                  <SelectItem value="medium">Średni</SelectItem>
                  <SelectItem value="low">Niski</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Issues List */}
      <div className="grid gap-4">
        {filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => {
            const student = getStudent(issue.studentId);
            const room = getRoom(issue.roomId);
            return (
              <Card key={issue.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {getCategoryIcon(issue.category)}
                        {issue.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span>Student: {student?.name || 'Nieznany'}</span>
                        <span>•</span>
                        <span>Pokój {room?.number || 'N/A'}</span>
                        <span>•</span>
                        <span>
                          {new Date(issue.createdAt).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(issue.priority)}
                      {getStatusBadge(issue.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Opis problemu:</p>
                      <p>{issue.description}</p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Kategoria:</span>{' '}
                        <Badge variant="outline" className="ml-1">
                          {getCategoryIcon(issue.category)}
                          <span className="ml-1">{getCategoryLabel(issue.category)}</span>
                        </Badge>
                      </div>
                      {issue.resolvedAt && (
                        <div>
                          <span className="text-muted-foreground">Rozwiązano:</span>{' '}
                          {new Date(issue.resolvedAt).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Select
                        value={issue.status}
                        onValueChange={(v: any) => handleStatusChange(issue.id, v)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue>{issue.status === 'open' ? 'Otwarte' : issue.status === 'in-progress' ? 'W trakcie' : issue.status === 'resolved' ? 'Rozwiązane' : 'Zamknięte'}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Otwarte</SelectItem>
                          <SelectItem value="in-progress">W trakcie</SelectItem>
                          <SelectItem value="resolved">Rozwiązane</SelectItem>
                          <SelectItem value="closed">Zamknięte</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Czat ({getIssueMessages(issue.id).length})
                        {expandedIssue === issue.id ? (
                          <ChevronUp className="w-4 h-4 ml-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-2" />
                        )}
                      </Button>
                    </div>

                    {/* Chat Section */}
                    {expandedIssue === issue.id && (
                      <div className="mt-4 border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 font-medium text-sm">
                          Konwersacja ze studentem
                        </div>
                        <Separator />
                        <ScrollArea className="h-64 p-4">
                          {getIssueMessages(issue.id).length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">Brak wiadomości</p>
                              <p className="text-xs mt-1">Rozpocznij konwersację ze studentem</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {getIssueMessages(issue.id).map((msg) => {
                                const isOwnMessage = msg.senderId === user?.id;
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        isOwnMessage
                                          ? 'bg-purple-600 text-white'
                                          : 'bg-muted'
                                      }`}
                                    >
                                      <p className="text-xs font-semibold mb-1">
                                        {msg.senderName} ({msg.senderRole === 'admin' ? 'Administrator' : 'Student'})
                                      </p>
                                      <p className="text-sm break-words">{msg.message}</p>
                                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-purple-100' : 'text-muted-foreground'}`}>
                                        {formatTime(msg.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={(el) => { messagesEndRefs.current[issue.id] = el; }} />
                            </div>
                          )}
                        </ScrollArea>
                        <Separator />
                        <div className="p-4 bg-muted/30">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Napisz wiadomość..."
                              value={messageInputs[issue.id] || ''}
                              onChange={(e) => setMessageInputs({ ...messageInputs, [issue.id]: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage(issue.id);
                                }
                              }}
                            />
                            <Button onClick={() => handleSendMessage(issue.id)} size="icon">
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Brak zgłoszeń
              </CardTitle>
              <CardDescription>
                Nie ma zgłoszeń pasujących do wybranych filtrów.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
