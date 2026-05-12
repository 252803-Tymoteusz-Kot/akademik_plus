import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { CreditCard, CheckCircle2, Clock, AlertCircle, DollarSign, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Payment } from '../../context/AppContext';

export function AdminPayments() {
  const { payments, students, updatePayment, rooms } = useApp();
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [selectedPaymentForBill, setSelectedPaymentForBill] = useState<Payment | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerateMonthly = async () => {
    if (generating) return;
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();
    if (!confirm(`Wygenerować rachunki za ${month}/${year} dla wszystkich studentów z pokojem?`)) return;

    setGenerating(true);
    try {
      const resp = await fetch('/api/payments/generate-monthly', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, dueDay: 10 }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.message || 'Nie udało się wygenerować rachunków');
        return;
      }
      toast.success(`Utworzono ${data.created} rachunków, pominięto ${data.skipped} (już istnieją)`);
    } catch (err) {
      console.error(err);
      toast.error('Błąd połączenia');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await updatePayment(paymentId, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Płatność została oznaczona jako opłacona');
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się zaktualizować płatności');
    }
  };

  const getStudent = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Opłacone
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Oczekujące
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Zaległość
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (filterStatus === 'all') return true;
    return payment.status === filterStatus;
  }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  const getStudentRoom = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.roomId) return null;
    return rooms.find(r => r.id === student.roomId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Zarządzanie płatnościami</h1>
          <p className="text-muted-foreground mt-2">Monitoruj opłaty i zaległości studentów</p>
        </div>
        <Button onClick={handleGenerateMonthly} disabled={generating}>
          <FileText className="w-4 h-4 mr-2" />
          {generating ? 'Generowanie...' : 'Wygeneruj rachunki na bieżący miesiąc'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Całkowity przychód</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString()} PLN</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter(p => p.status === 'paid').length} opłaconych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Do zapłaty</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingAmount.toLocaleString()} PLN</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter(p => p.status === 'pending').length} oczekujących
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zaległości</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueAmount.toLocaleString()} PLN</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter(p => p.status === 'overdue').length} zaległych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie płatności</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">w systemie</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista płatności</CardTitle>
              <CardDescription>Przeglądaj wszystkie płatności studentów</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue>{filterStatus === 'all' ? 'Wszystkie' : filterStatus === 'paid' ? 'Opłacone' : filterStatus === 'pending' ? 'Oczekujące' : 'Zaległości'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="paid">Opłacone</SelectItem>
                <SelectItem value="pending">Oczekujące</SelectItem>
                <SelectItem value="overdue">Zaległości</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Nr albumu</TableHead>
                  <TableHead>Okres</TableHead>
                  <TableHead>Termin płatności</TableHead>
                  <TableHead>Data wpłaty</TableHead>
                  <TableHead>Kwota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rachunek</TableHead>
                  <TableHead>Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const student = getStudent(payment.studentId);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{student?.name || 'Nieznany'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student?.studentId || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {payment.month} {payment.year}
                      </TableCell>
                      <TableCell>{new Date(payment.dueDate).toLocaleDateString('pl-PL')}</TableCell>
                      <TableCell>
                        {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('pl-PL') : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">{payment.amount} PLN</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger render={<Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPaymentForBill(payment)}
                            />}>
                              <span className="flex items-center gap-2">
                                <Eye className="w-4 h-4 mr-1" />
                                Zobacz
                              </span>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Podgląd rachunku
                              </DialogTitle>
                              <DialogDescription>
                                Rachunek za {payment.month} {payment.year}
                              </DialogDescription>
                            </DialogHeader>

                            {/* Bill Preview */}
                            <div className="border rounded-lg p-6 bg-white space-y-6">
                              {/* Header */}
                              <div className="text-center border-b pb-4">
                                <h2 className="text-2xl font-bold">Akademik+</h2>
                                <p className="text-sm text-muted-foreground">Rachunek za zakwaterowanie</p>
                              </div>

                              {/* Bill Details */}
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Student</p>
                                    <p className="text-lg font-semibold">{student?.name}</p>
                                    <p className="text-sm">{student?.studentId}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">Numer rachunku</p>
                                    <p className="text-lg font-mono">{payment.id.toUpperCase()}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date().toLocaleDateString('pl-PL')}
                                    </p>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Szczegóły zakwaterowania</p>
                                  {(() => {
                                    const room = getStudentRoom(payment.studentId);
                                    const studentData = students.find(s => s.id === payment.studentId);
                                    return room && studentData ? (
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <p>Pokój: <span className="font-medium">{room.number}</span></p>
                                        <p>Piętro: <span className="font-medium">{room.floor}</span></p>
                                        <p>Miejsce: <span className="font-medium">{studentData.bedNumber}</span></p>
                                        <p>Standard: <span className="font-medium">
                                          {room.standard === 'basic' ? 'Podstawowy' : room.standard === 'standard' ? 'Standardowy' : 'Premium'}
                                        </span></p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">Brak przypisanego pokoju</p>
                                    );
                                  })()}
                                </div>

                                {/* Payment Details */}
                                <div className="border-t pt-4">
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span>Okres rozliczeniowy:</span>
                                      <span className="font-medium">{payment.month} {payment.year}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Termin płatności:</span>
                                      <span className="font-medium">
                                        {new Date(payment.dueDate).toLocaleDateString('pl-PL')}
                                      </span>
                                    </div>
                                    {payment.paidDate && (
                                      <div className="flex justify-between">
                                        <span>Data wpłaty:</span>
                                        <span className="font-medium text-green-600">
                                          {new Date(payment.paidDate).toLocaleDateString('pl-PL')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Total Amount */}
                                <div className="border-t pt-4 bg-muted/50 -mx-6 px-6 py-4 mt-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Kwota do zapłaty:</span>
                                    <span className="text-2xl font-bold text-green-600">
                                      {payment.amount.toLocaleString()} PLN
                                    </span>
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div className="text-center pt-2">
                                  {getStatusBadge(payment.status)}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={() => document.querySelector('[data-state="open"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}>
                                Zamknij
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        {payment.status !== 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsPaid(payment.id)}
                          >
                            Oznacz jako opłacone
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredPayments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak płatności do wyświetlenia
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
