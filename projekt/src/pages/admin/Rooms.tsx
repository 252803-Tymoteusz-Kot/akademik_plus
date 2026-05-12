import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Building2, Plus, Users, DoorOpen, Wrench, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Room } from '../../context/AppContext';

export function AdminRooms() {
  const { rooms, students, addRoom, updateRoom } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'available' | 'full' | 'maintenance' | null>(null);
  const [roomToChangeStatus, setRoomToChangeStatus] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'full' | 'maintenance'>('all');
  const [filterStandard, setFilterStandard] = useState<'all' | 'basic' | 'standard' | 'premium'>('all');

  // Form state
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('1');
  const [capacity, setCapacity] = useState('2');
  const [standard, setStandard] = useState<'basic' | 'standard' | 'premium'>('basic');
  const [price, setPrice] = useState('500');
  const [equipment, setEquipment] = useState('Łóżko, Biurko, Szafa, Krzesło');
  const [soleUse, setSoleUse] = useState(false);

  const resetForm = () => {
    setNumber('');
    setFloor('1');
    setCapacity('2');
    setStandard('basic');
    setPrice('500');
    setEquipment('Łóżko, Biurko, Szafa, Krzesło');
    setSoleUse(false);
  };

  const handleSubmit = async () => {
    if (!number || !floor || !capacity || !price) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const newRoom: Omit<Room, 'id'> = {
      number,
      floor: parseInt(floor),
      capacity: parseInt(capacity),
      occupied: 0,
      standard,
      pricePerMonth: parseInt(price),
      equipment: equipment.split(',').map(e => e.trim()),
      status: 'available',
      soleUse,
    };

    try {
      await addRoom(newRoom);
      toast.success('Pokój został dodany');
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się dodać pokoju');
    }
  };

  const openEditDialog = (room: Room) => {
    setSelectedRoom(room);
    setNumber(room.number);
    setFloor(room.floor.toString());
    setCapacity(room.capacity.toString());
    setStandard(room.standard);
    setPrice(room.pricePerMonth.toString());
    setEquipment(room.equipment.join(', '));
    setSoleUse(room.soleUse || false);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedRoom || !number || !floor || !capacity || !price) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    try {
      await updateRoom(selectedRoom.id, {
        number,
        floor: parseInt(floor),
        capacity: parseInt(capacity),
        standard,
        pricePerMonth: parseInt(price),
        equipment: equipment.split(',').map(e => e.trim()),
        soleUse,
      });

      toast.success('Pokój został zaktualizowany');
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedRoom(null);
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się zaktualizować pokoju');
    }
  };

  const initiateStatusChange = (roomId: string, newStatus: 'available' | 'full' | 'maintenance') => {
    setRoomToChangeStatus(roomId);
    setPendingStatus(newStatus);
    setIsStatusConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    if (roomToChangeStatus && pendingStatus) {
      try {
        await updateRoom(roomToChangeStatus, { status: pendingStatus });
        toast.success('Status pokoju został zaktualizowany');
      } catch (err) {
        console.error(err);
        toast.error('Nie udało się zmienić statusu pokoju');
      }
    }
    setIsStatusConfirmOpen(false);
    setRoomToChangeStatus(null);
    setPendingStatus(null);
  };

  const getStatusLabel = (status: 'available' | 'full' | 'maintenance') => {
    switch (status) {
      case 'available': return 'Dostępny';
      case 'full': return 'Pełny';
      case 'maintenance': return 'Konserwacja';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500 hover:bg-green-600">Dostępny</Badge>;
      case 'full':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pełny</Badge>;
      case 'maintenance':
        return <Badge variant="destructive">Konserwacja</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStandardBadge = (std: string) => {
    switch (std) {
      case 'basic':
        return <Badge variant="outline">Podstawowy</Badge>;
      case 'standard':
        return <Badge variant="secondary">Standardowy</Badge>;
      case 'premium':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Premium</Badge>;
      default:
        return <Badge>{std}</Badge>;
    }
  };

  const getRoomStudents = (roomId: string) => {
    return students.filter(s => s.roomId === roomId);
  };

  // Filter rooms based on search and filters
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
    const matchesStandard = filterStandard === 'all' || room.standard === filterStandard;
    return matchesSearch && matchesStatus && matchesStandard;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zarządzanie pokojami</h1>
          <p className="text-muted-foreground mt-2">Przeglądaj i zarządzaj pokojami w akademiku</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button />}><span className="w-full flex items-center justify-center gap-2"><Plus className="w-4 h-4 mr-2" />
              Dodaj pokój</span></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dodaj nowy pokój</DialogTitle>
              <DialogDescription>
                Wprowadź informacje o nowym pokoju w akademiku
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Numer pokoju</Label>
                  <Input
                    id="number"
                    placeholder="101"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor">Piętro</Label>
                  <Input
                    id="floor"
                    type="number"
                    placeholder="1"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Liczba miejsc</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="2"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standard">Standard</Label>
                  <Select value={standard} onValueChange={(v: any) => setStandard(v)}>
                    <SelectTrigger id="standard">
                      <SelectValue>{standard === 'basic' ? 'Podstawowy' : standard === 'standard' ? 'Standardowy' : 'Premium'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Podstawowy</SelectItem>
                      <SelectItem value="standard">Standardowy</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Cena miesięczna (PLN)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Wyposażenie (oddzielone przecinkami)</Label>
                <Input
                  id="equipment"
                  placeholder="Łóżko, Biurko, Szafa, Krzesło"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="sole-use"
                  checked={soleUse}
                  onCheckedChange={(checked) => setSoleUse(checked as boolean)}
                />
                <Label
                  htmlFor="sole-use"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Rezerwuj pokój 2- lub 3-osobowy do wyłącznego użytku jednej osoby
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleSubmit}>Dodaj pokój</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po numerze pokoju..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger>
                <SelectValue>{filterStatus === 'all' ? 'Wszystkie statusy' : filterStatus === 'available' ? 'Dostępne' : filterStatus === 'full' ? 'Pełne' : 'Konserwacja'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="available">Dostępny</SelectItem>
                <SelectItem value="full">Pełny</SelectItem>
                <SelectItem value="maintenance">Konserwacja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStandard} onValueChange={(v: any) => setFilterStandard(v)}>
              <SelectTrigger>
                <SelectValue>{filterStandard === 'all' ? 'Wszystkie standardy' : filterStandard === 'basic' ? 'Podstawowy' : filterStandard === 'standard' ? 'Standardowy' : 'Premium'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie standardy</SelectItem>
                <SelectItem value="basic">Podstawowy</SelectItem>
                <SelectItem value="standard">Standardowy</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie pokoje</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dostępne</CardTitle>
            <DoorOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rooms.filter(r => r.status === 'available').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pełne</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {rooms.filter(r => r.status === 'full').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konserwacja</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {rooms.filter(r => r.status === 'maintenance').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista pokoi</CardTitle>
          <CardDescription>Szczegółowy widok wszystkich pokoi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numer</TableHead>
                  <TableHead>Piętro</TableHead>
                  <TableHead>Obłożenie</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Cena/mies.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => {
                  const roomStudents = getRoomStudents(room.id);
                  return (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.number}</TableCell>
                      <TableCell>{room.floor}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {room.occupied} / {room.capacity}
                        </div>
                      </TableCell>
                      <TableCell>{getStandardBadge(room.standard)}</TableCell>
                      <TableCell className="font-semibold">{room.pricePerMonth} PLN</TableCell>
                      <TableCell>{getStatusBadge(room.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(room)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edytuj
                          </Button>
                          <Dialog>
                            <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => setSelectedRoom(room)} />}>
                                Szczegóły
                            </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Pokój {room.number}</DialogTitle>
                              <DialogDescription>Szczegółowe informacje o pokoju</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Piętro</p>
                                  <p className="text-lg">{room.floor}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Pojemność</p>
                                  <p className="text-lg">{room.capacity} osób</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Obłożenie</p>
                                  <p className="text-lg">{room.occupied} / {room.capacity}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Czynsz</p>
                                  <p className="text-lg font-semibold">{room.pricePerMonth} PLN</p>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Wyposażenie</p>
                                <div className="flex flex-wrap gap-2">
                                  {room.equipment.map((item, i) => (
                                    <Badge key={i} variant="outline">
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {roomStudents.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Mieszkańcy</p>
                                  <div className="space-y-2">
                                    {roomStudents.map((student) => (
                                      <div key={student.id} className="flex items-center justify-between p-2 border rounded">
                                        <div>
                                          <p className="font-medium">{student.name}</p>
                                          <p className="text-sm text-muted-foreground">Miejsce {student.bedNumber}</p>
                                        </div>
                                        <Badge variant="outline">{student.studentId}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {room.soleUse && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Użytkowanie</p>
                                  <Badge variant="secondary">Wyłączne użytkowanie</Badge>
                                </div>
                              )}

                              <div>
                                <Label htmlFor="status-select">Zmień status pokoju</Label>
                                <Select
                                  value={room.status}
                                  onValueChange={(v: any) => initiateStatusChange(room.id, v)}
                                >
                                  <SelectTrigger id="status-select" className="mt-2">
                                    <SelectValue>{room.status === 'available' ? 'Dostępny' : room.status === 'full' ? 'Pełny' : 'Konserwacja'}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="available">Dostępny</SelectItem>
                                    <SelectItem value="full">Pełny</SelectItem>
                                    <SelectItem value="maintenance">Konserwacja</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Room Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj pokój</DialogTitle>
            <DialogDescription>
              Zaktualizuj informacje o pokoju
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-number">Numer pokoju</Label>
                <Input
                  id="edit-number"
                  placeholder="101"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-floor">Piętro</Label>
                <Input
                  id="edit-floor"
                  type="number"
                  placeholder="1"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Liczba miejsc</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  placeholder="2"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-standard">Standard</Label>
                <Select value={standard} onValueChange={(v: any) => setStandard(v)}>
                  <SelectTrigger id="edit-standard">
                    <SelectValue>{standard === 'basic' ? 'Podstawowy' : standard === 'standard' ? 'Standardowy' : 'Premium'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Podstawowy</SelectItem>
                    <SelectItem value="standard">Standardowy</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Cena miesięczna (PLN)</Label>
              <Input
                id="edit-price"
                type="number"
                placeholder="500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-equipment">Wyposażenie (oddzielone przecinkami)</Label>
              <Input
                id="edit-equipment"
                placeholder="Łóżko, Biurko, Szafa, Krzesło"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="edit-sole-use"
                checked={soleUse}
                onCheckedChange={(checked) => setSoleUse(checked as boolean)}
              />
              <Label
                htmlFor="edit-sole-use"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Rezerwuj pokój 2- lub 3-osobowy do wyłącznego użytku jednej osoby
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              resetForm();
              setSelectedRoom(null);
            }}>
              Anuluj
            </Button>
            <Button onClick={handleEditSubmit}>Zapisz zmiany</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdzenie zmiany statusu</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz zmienić status pokoju na "{pendingStatus ? getStatusLabel(pendingStatus) : ''}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsStatusConfirmOpen(false);
              setRoomToChangeStatus(null);
              setPendingStatus(null);
            }}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Potwierdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
