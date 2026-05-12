import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, User } from '../context/AppContext';

export function generatePaymentInvoice(payment: Payment, user: User | null) {
  const doc = new jsPDF();
  
  const stripPl = (str: string) => str.replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z')
    .replace(/Ą/g, 'A')
    .replace(/Ć/g, 'C')
    .replace(/Ę/g, 'E')
    .replace(/Ł/g, 'L')
    .replace(/Ń/g, 'N')
    .replace(/Ó/g, 'O')
    .replace(/Ś/g, 'S')
    .replace(/Ź/g, 'Z')
    .replace(/Ż/g, 'Z');
  
  // Header
  doc.setFontSize(20);
  doc.text(stripPl('Akademik+ - Rachunek'), 14, 22);
  
  doc.setFontSize(10);
  doc.text(stripPl(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`), 14, 30);
  
  // Company / Dorm details
  doc.setFontSize(12);
  doc.text(stripPl('Wystawca:'), 14, 45);
  doc.setFontSize(10);
  doc.text(stripPl('DormAdmin Pro Sp. z o.o.'), 14, 52);
  doc.text(stripPl('ul. Studencka 1, 00-000 Warszawa'), 14, 57);
  doc.text(stripPl('NIP: 123-456-78-90'), 14, 62);
  
  // Student details
  doc.setFontSize(12);
  doc.text(stripPl('Nabywca:'), 120, 45);
  doc.setFontSize(10);
  if (user) {
    doc.text(stripPl(`Imie i nazwisko: ${user.name}`), 120, 52);
    doc.text(stripPl(`Email: ${user.email}`), 120, 57);
    if (user.studentId) {
      doc.text(stripPl(`Nr albumu: ${user.studentId}`), 120, 62);
    }
  } else {
    doc.text(stripPl('Brak danych studenta'), 120, 52);
  }

  // Invoice / Payment details table
  autoTable(doc, {
    startY: 75,
    head: [[stripPl('Opis'), stripPl('Okres (Miesiac/Rok)'), stripPl('Kwota (PLN)'), stripPl('Status')]],
    body: [
      [
        stripPl('Oplata za zakwaterowanie'),
        stripPl(`${payment.month} ${payment.year}`),
        payment.amount.toFixed(2),
        payment.status === 'paid' ? 'Oplacone' : payment.status === 'pending' ? 'Oczekujace' : 'Zaleglosc'
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }
  });

  // Additional details
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  doc.setFontSize(10);
  doc.text(stripPl(`Termin platnosci: ${new Date(payment.dueDate).toLocaleDateString('pl-PL')}`), 14, finalY + 10);
  
  if (payment.paidDate) {
    doc.text(stripPl(`Data oplacenia: ${new Date(payment.paidDate).toLocaleDateString('pl-PL')}`), 14, finalY + 17);
  }

  doc.text(stripPl(`Numer transakcji / ID: ${payment.id}`), 14, finalY + 24);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(stripPl('Dokument wygenerowany elektronicznie. Nie wymaga podpisu.'), 105, 280, { align: 'center' });

  // Save the PDF
  doc.save(stripPl(`Rachunek_${payment.month}_${payment.year}.pdf`));
}
