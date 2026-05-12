import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      navigate('/');
    } else {
      setError('Nieprawidłowy email lub hasło');
    }
  };

  const handlePasswordReset = () => {
    if (!resetEmail) {
      toast.error('Wprowadź adres email');
      return;
    }

    // Mock password reset - in real app this would send email
    toast.success('Link do resetowania hasła został wysłany na adres ' + resetEmail);
    setIsResetDialogOpen(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
            DS
          </div>
          <div>
            <CardTitle className="text-3xl">Akademik+</CardTitle>
            <CardDescription className="mt-2">
              System zarządzania akademikiem
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="twoj.email@student.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Hasło</Label>
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <DialogTrigger type="button" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">Nie pamiętasz hasła?</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Odzyskiwanie hasła</DialogTitle>
                      <DialogDescription>
                        Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="twoj.email@student.pl"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
                        Anuluj
                      </Button>
                      <Button onClick={handlePasswordReset}>Wyślij link</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logowanie...' : 'Zaloguj się'}
            </Button>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-900">Demo loginy:</p>
              <div className="space-y-2 text-sm text-blue-700">
                <p>
                  <strong>Administrator:</strong>
                  <br />
                  Email: admin@akademik.pl
                  <br />
                  Hasło: admin
                </p>
                <p>
                  <strong>Student:</strong>
                  <br />
                  Email: jan.kowalski@student.pl
                  <br />
                  Hasło: student
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
