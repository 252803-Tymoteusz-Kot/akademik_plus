import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Progress } from '../../components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, Users, Building2, CreditCard } from 'lucide-react';

export function AdminReports() {
  const { rooms, students, payments, issues } = useApp();

  // Occupancy statistics by floor
  const floorStats = Array.from(new Set(rooms.map(r => r.floor)))
    .sort((a, b) => a - b)
    .map(floor => {
      const floorRooms = rooms.filter(r => r.floor === floor);
      const totalCapacity = floorRooms.reduce((sum, r) => sum + r.capacity, 0);
      const totalOccupied = floorRooms.reduce((sum, r) => sum + r.occupied, 0);
      return {
        id: `floor-${floor}`,
        floor: `Piętro ${floor}`,
        capacity: totalCapacity,
        occupied: totalOccupied,
        occupancyRate: totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0,
      };
    });

  // Room standard distribution
  const standardStats = [
    { id: 'basic', name: 'Podstawowy', value: rooms.filter(r => r.standard === 'basic').length, color: '#94a3b8' },
    { id: 'standard', name: 'Standardowy', value: rooms.filter(r => r.standard === 'standard').length, color: '#60a5fa' },
    { id: 'premium', name: 'Premium', value: rooms.filter(r => r.standard === 'premium').length, color: '#a78bfa' },
  ];

  // Revenue by month (from paid payments)
  const monthlyRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((acc, p) => {
      const key = `${p.month} ${p.year}`;
      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += p.amount;
      return acc;
    }, {} as Record<string, number>);

  const revenueData = Object.entries(monthlyRevenue).map(([month, amount], index) => ({
    id: `revenue-${index}`,
    month,
    amount,
  }));

  // Issue categories distribution
  const issueCategories = [
    { id: 'plumbing', category: 'Hydraulika', count: issues.filter(i => i.category === 'plumbing').length },
    { id: 'electrical', category: 'Elektryka', count: issues.filter(i => i.category === 'electrical').length },
    { id: 'furniture', category: 'Meble', count: issues.filter(i => i.category === 'furniture').length },
    { id: 'heating', category: 'Ogrzewanie', count: issues.filter(i => i.category === 'heating').length },
    { id: 'other', category: 'Inne', count: issues.filter(i => i.category === 'other').length },
  ];

  // Top rooms by revenue (based on standard and occupancy)
  const roomRevenue = rooms.map(room => {
    const roomStudents = students.filter(s => s.roomId === room.id);
    const monthlyRevenue = room.pricePerMonth * room.occupied;
    return {
      id: room.id,
      number: room.number,
      floor: room.floor,
      occupied: room.occupied,
      capacity: room.capacity,
      monthlyRevenue,
    };
  }).sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 10);

  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied, 0);
  const totalMonthlyRevenue = rooms.reduce((sum, r) => sum + (r.pricePerMonth * r.occupied), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Raporty i statystyki</h1>
        <p className="text-muted-foreground mt-2">Szczegółowe analizy wykorzystania akademika</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Globalny wskaźnik obłożenia</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0}%
            </div>
            <Progress value={totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miesięczny przychód (potencjalny)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonthlyRevenue.toLocaleString()} PLN</div>
            <p className="text-xs text-muted-foreground mt-1">
              z {occupiedBeds} zajętych miejsc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Śr. cena za miejsce</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupiedBeds > 0 ? Math.round(totalMonthlyRevenue / occupiedBeds) : 0} PLN
            </div>
            <p className="text-xs text-muted-foreground mt-1">miesięcznie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liczba mieszkańców</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter(s => s.roomId).length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              z {students.length} zarejestrowanych
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Occupancy by Floor */}
        <Card>
          <CardHeader>
            <CardTitle>Obłożenie według pięter</CardTitle>
            <CardDescription>Porównanie zajętości miejsc na poszczególnych piętrach</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={floorStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="floor" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="occupied" fill="#60a5fa" name="Zajęte" />
                <Bar dataKey="capacity" fill="#e2e8f0" name="Pojemność" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Room Standards Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rozkład standardów pokoi</CardTitle>
            <CardDescription>Podział pokoi według poziomu wyposażenia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={standardStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {standardStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Przychody miesięczne</CardTitle>
            <CardDescription>Opłacone płatności w poszczególnych miesiącach</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#10b981" name="Przychód (PLN)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Issue Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Kategorie zgłoszeń</CardTitle>
          <CardDescription>Rozkład zgłoszeń technicznych według kategorii</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {issueCategories.map((category) => {
              const total = issueCategories.reduce((sum, c) => sum + c.count, 0);
              const percentage = total > 0 ? (category.count / total) * 100 : 0;
              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {category.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Revenue Generating Rooms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Top 10 pokoi według przychodu
          </CardTitle>
          <CardDescription>Pokoje generujące największy miesięczny przychód</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numer pokoju</TableHead>
                  <TableHead>Piętro</TableHead>
                  <TableHead>Obłożenie</TableHead>
                  <TableHead>Miesięczny przychód</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomRevenue.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.number}</TableCell>
                    <TableCell>{room.floor}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>
                          {room.occupied} / {room.capacity}
                        </span>
                        <Badge variant={room.occupied === room.capacity ? 'default' : 'secondary'}>
                          {room.occupied === room.capacity ? 'Pełny' : 'Częściowo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{room.monthlyRevenue.toLocaleString()} PLN</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
