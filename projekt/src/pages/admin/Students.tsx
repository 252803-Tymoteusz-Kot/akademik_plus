import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Users, Plus, UserCheck, UserX, Building2, Link2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export function AdminStudents() {
  const { students, rooms, assignStudentToRoom, removeStudentFromRoom } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isInviteLinkDialogOpen, setIsInviteLinkDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [invitationLink, setInvitationLink] = useState('');

  // Form state for new student
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');

  // Assignment form state
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [bedNumber, setBedNumber] = useState('1');

  const resetAddForm = () => {
    setName('');
    setEmail('');
    setStudentId('');
    setPhone('');
  };

  const resetAssignForm = () => {
    setSelectedRoomId('');
    setBedNumber('1');
  };

  const handleAddStudent = () => {
    if (!name || !email || !studentId || !phone) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      token,
      email,
      name,
      studentId,
      phone
    });
    const link = `${window.location.origin}/register?${params.toString()}`;
    setInvitationLink(link);

    setIsAddDialogOpen(false);
    setIsInviteLinkDialogOpen(true);
  };

  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success('Link zaproszenia skopiowany do schowka!');
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent || !selectedRoomId || !bedNumber) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) {
      toast.error('Pokój nie istnieje');
      return;
    }

    if (room.occupied >= room.capacity) {
      toast.error('Pokój jest pełny');
      return;
    }

    try {
      await assignStudentToRoom(selectedStudent, selectedRoomId, parseInt(bedNumber));
      toast.success('Student został przypisany do pokoju');
      setIsAssignDialogOpen(false);
      setSelectedStudent(null);
      resetAssignForm();
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się przypisać studenta');
    }
  };

  const handleRemoveFromRoom = async (studentId: string) => {
    try {
      await removeStudentFromRoom(studentId);
      toast.success('Student został usunięty z pokoju');
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się usunąć studenta z pokoju');
    }
  };

  const getRoom = (roomId: string | null) => {
    if (!roomId) return null;
    return rooms.find(r => r.id === roomId);
  };

  const assignedStudents = students.filter(s => s.roomId !== null).length;
  const unassignedStudents = students.filter(s => s.roomId === null).length;

  const availableRooms = rooms.filter(r => r.status === 'available' && r.occupied < r.capacity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zarządzanie studentami</h1>
          <p className="text-muted-foreground mt-2">Przeglądaj i przypisuj studentów do pokoi</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger render={<Button />}><span className="w-full flex items-center justify-center gap-2"><Plus className="w-4 h-4 mr-2" />
              Dodaj studenta</span></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj nowego studenta</DialogTitle>
              <DialogDescription>
                Wprowadź dane studenta do systemu
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Imię i nazwisko</Label>
                <Input
                  id="name"
                  placeholder="Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jan.kowalski@student.pl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId">Numer albumu</Label>
                <Input
                  id="studentId"
                  placeholder="STU001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  placeholder="+48 123 456 789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleAddStudent}>Dodaj studenta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszyscy studenci</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zakwaterowani</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{assignedStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bez pokoju</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unassignedStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista studentów</CardTitle>
          <CardDescription>Przeglądaj i zarządzaj wszystkimi studentami</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Nr albumu</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Pokój</TableHead>
                  <TableHead>Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const room = getRoom(student.roomId);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.studentId}</Badge>
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phoneNumber}</TableCell>
                      <TableCell>
                        {room ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {room.number} (Miejsce {student.bedNumber})
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary">Nie przypisano</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.roomId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromRoom(student.id)}
                          >
                            Usuń z pokoju
                          </Button>
                        ) : (
                          <Dialog
                            open={isAssignDialogOpen && selectedStudent === student.id}
                            onOpenChange={(open) => {
                              setIsAssignDialogOpen(open);
                              if (open) {
                                setSelectedStudent(student.id);
                              } else {
                                setSelectedStudent(null);
                                resetAssignForm();
                              }
                            }}
                          >
                            <DialogTrigger render={<Button variant="outline" size="sm" />}><span className="w-full flex items-center justify-center gap-2">Przypisz pokój</span></DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Przypisz pokój</DialogTitle>
                                <DialogDescription>
                                  Przypisz {student.name} do pokoju
                                </DialogDescription>
                              </DialogHeader>

                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="room-select">Pokój</Label>
                                  <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                                    <SelectTrigger id="room-select">
                                      <SelectValue placeholder="Wybierz pokój" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableRooms.map((room) => (
                                        <SelectItem key={room.id} value={room.id}>
                                          Pokój {room.number} (P. {room.floor}) • {room.occupied}/{room.capacity}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="bed-number">Numer miejsca</Label>
                                  <Input
                                    id="bed-number"
                                    type="number"
                                    min="1"
                                    value={bedNumber}
                                    onChange={(e) => setBedNumber(e.target.value)}
                                  />
                                </div>
                              </div>

                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsAssignDialogOpen(false);
                                    setSelectedStudent(null);
                                    resetAssignForm();
                                  }}
                                >
                                  Anuluj
                                </Button>
                                <Button onClick={handleAssignStudent}>Przypisz</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invitation Link Dialog */}
      <Dialog open={isInviteLinkDialogOpen} onOpenChange={(open) => {
        setIsInviteLinkDialogOpen(open);
        if (!open) resetAddForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Student dodany pomyślnie!
            </DialogTitle>
            <DialogDescription>
              Link zaproszenia został wygenerowany. Wyślij go studentowi, aby mógł ustawić hasło i zalogować się do systemu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Link zaproszenia</Label>
              <div className="flex gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyInvitationLink} size="icon">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Instrukcja dla studenta:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Kliknij w link zaproszenia lub wklej go w przeglądarce</li>
                <li>Ustaw swoje hasło (minimum 8 znaków)</li>
                <li>Zaloguj się do systemu Akademik+</li>
              </ol>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Uwaga:</strong> Link zaproszenia jest ważny przez 7 dni. Student może użyć go tylko raz do ustawienia hasła.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setIsInviteLinkDialogOpen(false);
              resetAddForm();
            }}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
