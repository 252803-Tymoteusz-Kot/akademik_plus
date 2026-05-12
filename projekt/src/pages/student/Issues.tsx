import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { AlertCircle, Plus, Wrench, Zap, Armchair, Thermometer, HelpCircle, Clock, CheckCircle2, AlertTriangle, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export function StudentIssues() {
  const { user, issues, rooms, students, addIssue, issueMessages, addIssueMessage } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'plumbing' | 'electrical' | 'furniture' | 'heating' | 'other'>('other');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const studentData = students.find(s => s.id === user?.id);
  // Najnowsze zgłoszenia na górze - sortujemy malejąco po dacie utworzenia
  const studentIssues = issues
    .filter(i => i.studentId === user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = async () => {
    if (!title || !description || !studentData?.roomId) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    try {
      await addIssue({
        studentId: user!.id,
        roomId: studentData.roomId,
        title,
        description,
        category,
        status: 'open',
        priority,
      });

      toast.success('Zgłoszenie zostało dodane');
      setIsDialogOpen(false);
      setTitle('');
      setDescription('');
      setCategory('other');
      setPriority('medium');
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się dodać zgłoszenia');
    }
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

  const getRoom = (roomId: string) => {
    return rooms.find(r => r.id === roomId);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zgłoszenia usterek</h1>
          <p className="text-muted-foreground mt-2">Zgłaszaj problemy techniczne w swoim pokoju</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button disabled={!studentData?.roomId} />}><span className="w-full flex items-center justify-center gap-2"><Plus className="w-4 h-4 mr-2" />
              Nowe zgłoszenie</span></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nowe zgłoszenie usterki</DialogTitle>
              <DialogDescription>
                Opisz problem, a zespół techniczny zajmie się nim tak szybko, jak to możliwe
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł zgłoszenia</Label>
                <Input
                  id="title"
                  placeholder="Krótki opis problemu"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Szczegółowy opis</Label>
                <Textarea
                  id="description"
                  placeholder="Opisz problem dokładnie..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategoria</Label>
                  <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                    <SelectTrigger id="category">
                      <SelectValue>{category === 'plumbing' ? 'Hydraulika' : category === 'electrical' ? 'Elektryka' : category === 'furniture' ? 'Meble' : category === 'heating' ? 'Ogrzewanie' : 'Inne'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Hydraulika</SelectItem>
                      <SelectItem value="electrical">Elektryka</SelectItem>
                      <SelectItem value="furniture">Meble</SelectItem>
                      <SelectItem value="heating">Ogrzewanie</SelectItem>
                      <SelectItem value="other">Inne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priorytet</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger id="priority">
                      <SelectValue>{priority === 'low' ? 'Niski' : priority === 'medium' ? 'Średni' : 'Wysoki'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niski</SelectItem>
                      <SelectItem value="medium">Średni</SelectItem>
                      <SelectItem value="high">Wysoki</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleSubmit}>Wyślij zgłoszenie</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!studentData?.roomId && (
        <Card>
          <CardHeader>
            <CardTitle>Brak przypisanego pokoju</CardTitle>
            <CardDescription>
              Aby zgłosić usterkę, musisz mieć przypisany pokój w akademiku.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Issues List */}
      <div className="grid gap-4">
        {studentIssues.length > 0 ? (
          studentIssues.map((issue) => {
            const room = getRoom(issue.roomId);
            return (
              <Card key={issue.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {getCategoryIcon(issue.category)}
                        {issue.title}
                      </CardTitle>
                      <CardDescription>
                        Pokój {room?.number} • {new Date(issue.createdAt).toLocaleDateString('pl-PL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(issue.priority)}
                      {getStatusBadge(issue.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Opis problemu:</p>
                      <p>{issue.description}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
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

                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Czat z administratorem ({getIssueMessages(issue.id).length})
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
                          Konwersacja z administracją
                        </div>
                        <Separator />
                        <ScrollArea className="h-64 p-4">
                          {getIssueMessages(issue.id).length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">Brak wiadomości</p>
                              <p className="text-xs mt-1">Zadaj pytanie dotyczące tego zgłoszenia</p>
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
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-muted'
                                      }`}
                                    >
                                      <p className="text-xs font-semibold mb-1">
                                        {msg.senderName} ({msg.senderRole === 'admin' ? 'Administrator' : 'Student'})
                                      </p>
                                      <p className="text-sm break-words">{msg.message}</p>
                                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-muted-foreground'}`}>
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
                <AlertCircle className="h-5 w-5" />
                Brak zgłoszeń
              </CardTitle>
              <CardDescription>
                Nie masz jeszcze żadnych zgłoszeń. Jeśli zauważysz jakiś problem, zgłoś go za pomocą przycisku powyżej.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
