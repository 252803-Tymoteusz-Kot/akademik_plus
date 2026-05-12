import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { CreditCard, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { generatePaymentInvoice } from '../../lib/pdfGenerator';
import { toast } from 'sonner';

export function StudentPayments() {
  const { user, payments, updatePayment } = useApp();

  const handlePay = async (paymentId: string) => {
    try {
      await updatePayment(paymentId, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Płatność opłacona!');
    } catch (err) {
      console.error(err);
      toast.error('Nie udało się opłacić');
    }
  };

  const studentPayments = payments
    .filter(p => p.studentId === user?.id)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const totalPaid = studentPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = studentPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = studentPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historia opłat</h1>
        <p className="text-muted-foreground mt-2">Przeglądaj swoje płatności i stan rozliczeń</p>
      </div>

      {/* Payment Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Całkowicie opłacone</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPaid} PLN</div>
            <p className="text-xs text-muted-foreground">
              {studentPayments.filter(p => p.status === 'paid').length} płatności
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Do zapłaty</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalPending} PLN</div>
            <p className="text-xs text-muted-foreground">
              {studentPayments.filter(p => p.status === 'pending').length} płatności
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zaległości</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOverdue} PLN</div>
            <p className="text-xs text-muted-foreground">
              {studentPayments.filter(p => p.status === 'overdue').length} zaległych
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historia płatności
          </CardTitle>
          <CardDescription>Szczegółowa lista wszystkich opłat za zakwaterowanie</CardDescription>
        </CardHeader>
        <CardContent>
          {studentPayments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Okres</TableHead>
                    <TableHead>Termin płatności</TableHead>
                    <TableHead>Data wpłaty</TableHead>
                    <TableHead>Kwota</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.month} {payment.year}
                      </TableCell>
                      <TableCell>{new Date(payment.dueDate).toLocaleDateString('pl-PL')}</TableCell>
                      <TableCell>
                        {payment.paidDate
                          ? new Date(payment.paidDate).toLocaleDateString('pl-PL')
                          : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">{payment.amount} PLN</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => handlePay(payment.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Zapłać
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => generatePaymentInvoice(payment, user)}
                            title="Pobierz rachunek PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Brak historii płatności
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
