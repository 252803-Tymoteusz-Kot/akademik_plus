import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Lock } from 'lucide-react';
import { toast } from 'sonner';


export function Settings() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Nowe hasła nie są identyczne');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Nowe hasło musi mieć co najmniej 6 znaków');
      return;
    }

    try {
      const resp = await fetch('/api/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        toast.error(data.message || 'Nie udało się zmienić hasła');
        return;
      }
      toast.success('Hasło zmienione. Zaloguj się ponownie.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error('Błąd połączenia z serwerem');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ustawienia</h1>
        <p className="text-muted-foreground mt-2">Zarządzaj swoim kontem</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil użytkownika
            </CardTitle>
            <CardDescription>Twoje dane w systemie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Imię i nazwisko</Label>
                <p className="text-lg">{user?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-lg">{user?.email}</p>
              </div>
              {user?.role === 'student' && user?.studentId && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Numer albumu</Label>
                  <p className="text-lg">{user.studentId}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Rola</Label>
                <p className="text-lg">{user?.role === 'admin' ? 'Administrator' : 'Student'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Zmień hasło
            </CardTitle>
            <CardDescription>Zaktualizuj hasło do swojego konta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Obecne hasło</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Wprowadź obecne hasło"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe hasło</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Wprowadź nowe hasło"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Potwierdź nowe hasło"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button onClick={handleChangePassword} className="w-full">
              Zmień hasło
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
