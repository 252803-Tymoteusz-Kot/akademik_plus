import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Building2, Users, BedDouble, CreditCard, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Progress } from '../../components/ui/progress';

export function AdminDashboard() {
  const { rooms, students, payments, issues } = useApp();
  const navigate = useNavigate();

  // Calculate stats
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(r => r.status === 'available').length;
  const fullRooms = rooms.filter(r => r.status === 'full').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;

  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied, 0);
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  const assignedStudents = students.filter(s => s.roomId !== null).length;
  const totalStudents = students.length;

  const overduePayments = payments.filter(p => p.status === 'overdue').length;
  const paidPayments = payments.filter(p => p.status === 'paid');
  const uniquePaidUsers = new Set(paidPayments.map(p => p.studentId)).size;

  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'in-progress').length;
  const highPriorityIssues = issues.filter(i => i.priority === 'high' && i.status !== 'closed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel administracyjny</h1>
        <p className="text-muted-foreground mt-2">Przegląd ogólny akademika</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pokoje ogółem</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRooms}</div>
            <p className="text-xs text-muted-foreground">
              {availableRooms} dostępnych, {fullRooms} pełnych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obłożenie</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {occupiedBeds} / {totalBeds} miejsc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Studenci</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {assignedStudents} zakwaterowanych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy opłaceni</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniquePaidUsers}</div>
            <p className="text-xs text-muted-foreground">
              {paidPayments.length} opłaconych płatności
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Obłożenie pokoi</CardTitle>
            <CardDescription>Aktualna zajętość miejsc w akademiku</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Całkowite obłożenie</span>
                <span className="text-sm text-muted-foreground">
                  {occupiedBeds} / {totalBeds}
                </span>
              </div>
              <Progress value={occupancyRate} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{availableRooms}</p>
                <p className="text-xs text-muted-foreground">Dostępne</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{fullRooms}</p>
                <p className="text-xs text-muted-foreground">Pełne</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{maintenanceRooms}</p>
                <p className="text-xs text-muted-foreground">Konserwacja</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zgłoszenia i płatności</CardTitle>
            <CardDescription>Wymagające uwagi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/admin/issues')}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="font-medium">Otwarte zgłoszenia</p>
                  <p className="text-sm text-muted-foreground">
                    {highPriorityIssues} o wysokim priorytecie
                  </p>
                </div>
              </div>
              <div className="text-2xl font-bold">{openIssues}</div>
            </div>

            <div 
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/admin/payments')}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="font-medium">Zaległe płatności</p>
                  <p className="text-sm text-muted-foreground">Wymagają przypomnienia</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{overduePayments}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Distribution by Standard */}
      <Card>
        <CardHeader>
          <CardTitle>Rozkład pokoi według standardu</CardTitle>
          <CardDescription>Podział według typu pokoju</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {['basic', 'standard', 'premium'].map((standard) => {
              const standardRooms = rooms.filter(r => r.standard === standard);
              const count = standardRooms.length;
              const occupied = standardRooms.reduce((sum, r) => sum + r.occupied, 0);
              const capacity = standardRooms.reduce((sum, r) => sum + r.capacity, 0);
              const occupancyPct = capacity > 0 ? (occupied / capacity) * 100 : 0;

              const labels: Record<string, string> = {
                basic: 'Podstawowy',
                standard: 'Standardowy',
                premium: 'Premium',
              };

              const getRoomLabel = (count: number) => {
                if (count === 1) return 'pokój';
                if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
                  return 'pokoje';
                }
                return 'pokoi';
              };

              return (
                <div key={standard} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{labels[standard]}</h3>
                    <span className="text-sm text-muted-foreground">{count} {getRoomLabel(count)}</span>
                  </div>
                  <Progress value={occupancyPct} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {occupied} / {capacity} miejsc ({occupancyPct.toFixed(0)}%)
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <CardTitle>Cennik pokoi</CardTitle>
          </div>
          <CardDescription>Stawki miesięczne według standardu pokoju</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Standard</TableHead>
                <TableHead>Cena miesięczna</TableHead>
                <TableHead>Wyposażenie</TableHead>
                <TableHead>Liczba pokoi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Podstawowy</Badge>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">500 PLN</TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    Łóżko, Biurko, Szafa, Krzesło
                  </div>
                </TableCell>
                <TableCell>
                  {rooms.filter(r => r.standard === 'basic').length} pokoi
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Standardowy</Badge>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">600 PLN</TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    Łóżko, Biurko, Szafa, Krzesło, Lodówka
                  </div>
                </TableCell>
                <TableCell>
                  {rooms.filter(r => r.standard === 'standard').length} pokoi
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500 hover:bg-purple-600">Premium</Badge>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">800 PLN</TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    Łóżko, Biurko, Szafa, Krzesło, Lodówka, Łazienka prywatna, TV
                  </div>
                </TableCell>
                <TableCell>
                  {rooms.filter(r => r.standard === 'premium').length} pokoi
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Informacje dodatkowe:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Opłaty są naliczane miesięcznie z góry</li>
              <li>Możliwość rezerwacji pokoju 2- lub 3-osobowego do wyłącznego użytku (dopłata 50%)</li>
              <li>Kaucja zwrotna: 500 PLN (jednorazowo przy zakwaterowaniu)</li>
              <li>Opłaty za media (prąd, woda) wliczone w cenę</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
