import { Link, Outlet, useNavigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Building2, Home, CreditCard, AlertTriangle, Settings, LogOut } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

export function StudentLayout() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/student', icon: Home, label: 'Panel główny', exact: true },
    { path: '/student/payments', icon: CreditCard, label: 'Płatności' },
    { path: '/student/issues', icon: AlertTriangle, label: 'Zgłoszenia' },
    { path: '/student/settings', icon: Settings, label: 'Ustawienia' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                DS
              </div>
              <span className="text-slate-900">Akademik+</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="bg-white text-slate-900 border-slate-200 hover:bg-slate-100">
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link key={item.path} to={item.path} className="flex-shrink-0">
                  <Button
                    variant={active ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}
