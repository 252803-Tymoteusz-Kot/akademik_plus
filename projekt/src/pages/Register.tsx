import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';

export function Register() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const prefilledName = searchParams.get('name') || '';
  const prefilledStudentId = searchParams.get('studentId') || '';
  const prefilledPhone = searchParams.get('phone') || '';
  
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      setError('Brak adresu email w linku rejestracyjnym.');
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Hasła nie są identyczne');
      return;
    }

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prefilledName,
          email,
          studentId: prefilledStudentId,
          phoneNumber: prefilledPhone,
          password,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.message || 'Nie udało się utworzyć konta');
        return;
      }

      setIsSuccess(true);
      toast.success('Konto zostało utworzone pomyślnie!');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Register error:', err);
      setError('Błąd połączenia z serwerem');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md text-center py-8">
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Konto utworzone!</CardTitle>
            <p className="text-muted-foreground">
              Za chwilę zostaniesz przekierowany do strony logowania...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
            <Building2 className="size-8" />
          </div>
          <div>
            <CardTitle className="text-3xl">Rejestracja</CardTitle>
            <CardDescription className="mt-2">
              Utwórz konto studenta w systemie Akademik+
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>Imię i nazwisko</Label>
              <Input
                value={prefilledName}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Ustaw hasło</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Potwierdź hasło</Label>
              <Input
                id="passwordConfirm"
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={!email || password === ''}>
              Zarejestruj się
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
