import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Building2, BedDouble, Calendar, CreditCard, AlertTriangle } from 'lucide-react';

export function StudentDashboard() {
  const { user, students, rooms, payments, issues } = useApp();
  const navigate = useNavigate();

  const studentData = students.find(s => s.id === user?.id);
  const room = studentData?.roomId ? rooms.find(r => r.id === studentData.roomId) : null;
  const studentPayments = payments.filter(p => p.studentId === user?.id);
  const studentIssues = issues.filter(i => i.studentId === user?.id && i.status !== 'closed');

  const overduePayments = studentPayments.filter(p => p.status === 'overdue').length;
  const pendingPayments = studentPayments.filter(p => p.status === 'pending').length;
  const openIssues = studentIssues.filter(i => i.status === 'open').length;

  const getStandardLabel = (standard: string) => {
    switch (standard) {
      case 'basic':
        return 'Podstawowy';
      case 'standard':
        return 'Standardowy';
      case 'premium':
        return 'Premium';
      default:
        return standard;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel studenta</h1>
        <p className="text-muted-foreground mt-2">Witaj, {user?.name}!</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mój pokój</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{room ? room.number : 'Brak'}</div>
            <p className="text-xs text-muted-foreground">
              {room ? `Piętro ${room.floor}, Miejsce ${studentData?.bedNumber}` : 'Nie przypisano'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zaległe płatności</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent 
            className="cursor-pointer hover:bg-muted/50 transition-colors rounded-b-lg"
            onClick={() => navigate('/student/payments')}
          >
            <div className="text-2xl font-bold">{overduePayments}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments} oczekujących
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zgłoszenia</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent 
            className="cursor-pointer hover:bg-muted/50 transition-colors rounded-b-lg"
            onClick={() => navigate('/student/issues')}
          >
            <div className="text-2xl font-bold">{studentIssues.length}</div>
            <p className="text-xs text-muted-foreground">
              {openIssues} otwartych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Czas zamieszkania</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentData?.checkInDate
                ? Math.floor(
                    (new Date().getTime() - new Date(studentData.checkInDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">dni</p>
          </CardContent>
        </Card>
      </div>

      {/* Room Details */}
      {room && studentData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Szczegóły pokoju
            </CardTitle>
            <CardDescription>Informacje o Twoim aktualnym pokoju</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Numer pokoju</p>
                  <p className="text-2xl font-bold">{room.number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Piętro</p>
                  <p className="text-lg">{room.floor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Numer miejsca</p>
                  <p className="text-lg">{studentData.bedNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Standard</p>
                  <Badge variant="secondary">{getStandardLabel(room.standard)}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pojemność pokoju</p>
                  <p className="text-lg">
                    {room.occupied} / {room.capacity} osoby
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Czynsz miesięczny</p>
                  <p className="text-lg font-semibold">{room.pricePerMonth} PLN</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data wprowadzenia</p>
                  <p className="text-lg">{new Date(studentData.checkInDate!).toLocaleDateString('pl-PL')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Wyposażenie</p>
                  <div className="flex flex-wrap gap-2">
                    {room.equipment.map((item, index) => (
                      <Badge key={index} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                {room.soleUse && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Opcje specjalne</p>
                    <Badge className="bg-purple-500 hover:bg-purple-600">
                      Wyłączny użytek możliwy
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Możliwość rezerwacji pokoju do wyłącznego użytku jednej osoby
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!room && (
        <Card>
          <CardHeader>
            <CardTitle>Brak przypisanego pokoju</CardTitle>
            <CardDescription>
              Obecnie nie masz przypisanego pokoju w akademiku. Skontaktuj się z administracją.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
