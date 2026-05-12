import { Link, Outlet, useNavigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { Building2, LayoutDashboard, DoorOpen, Users, CreditCard, AlertTriangle, FileText, Settings, LogOut } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

export function AdminLayout() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/rooms', icon: DoorOpen, label: 'Pokoje' },
    { path: '/admin/students', icon: Users, label: 'Studenci' },
    { path: '/admin/payments', icon: CreditCard, label: 'Płatności' },
    { path: '/admin/issues', icon: AlertTriangle, label: 'Zgłoszenia' },
    { path: '/admin/reports', icon: FileText, label: 'Raporty' },
    { path: '/admin/settings', icon: Settings, label: 'Ustawienia' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                DS
              </div>
              <span className="text-sidebar-foreground">Akademik+</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Nawigacja</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path, item.exact);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton isActive={active} render={<Link to={item.path} />}><Icon className="w-4 h-4" />
                            <span>{item.label}</span></SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <div className="mb-3 px-2">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout} className="w-full bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              Wyloguj
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header with Sidebar Toggle */}
          <header className="bg-white border-b sticky top-0 z-10 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
          </header>

          <main className="flex-1 px-6 py-8">
            <Outlet />
          </main>
        </div>

        {/* Chat Widget */}
        <ChatWidget />
      </div>
    </SidebarProvider>
  );
}
