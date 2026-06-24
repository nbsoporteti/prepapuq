import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, LayoutDashboard, Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import RolContextSwitcher from '@/components/shared/RolContextSwitcher.jsx';

const DASHBOARD_POR_ROL = {
  estudiante: '/dashboard/estudiante',
  apoderado: '/dashboard/apoderado',
  profesor: '/dashboard/profesor',
  administrativo: '/dashboard/administrativo',
  admin: '/dashboard/admin',
};

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, logout, rolActivo, rolesEffective } = useAuth();

  const isHomePage = location.pathname === '/';

  const scrollToSection = (sectionId) => {
    if (isHomePage) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setIsOpen(false);
      }
    } else {
      navigate(`/#${sectionId}`);
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const getDashboardLink = () => {
    if (rolActivo && DASHBOARD_POR_ROL[rolActivo]) return DASHBOARD_POR_ROL[rolActivo];
    if (currentUser?.rol && DASHBOARD_POR_ROL[currentUser.rol]) return DASHBOARD_POR_ROL[currentUser.rol];
    if (rolesEffective && rolesEffective.length > 0 && DASHBOARD_POR_ROL[rolesEffective[0]]) {
      return DASHBOARD_POR_ROL[rolesEffective[0]];
    }
    return '/login';
  };

  const navLinks = [
    { label: 'Cursos', sectionId: 'cursos' },
    { label: 'Beneficios', sectionId: 'beneficios' },
    { label: 'Contacto', sectionId: 'contacto' }
  ];

  // Extracted navigation links to ensure a single source of truth
  const renderNavLinks = (isMobile = false) => {
    if (!isHomePage) return null;
    
    return navLinks.map((link) => (
      <button
        key={link.sectionId}
        onClick={() => scrollToSection(link.sectionId)}
        className={`font-medium transition-colors duration-200 hover:text-primary ${
          isMobile ? 'text-left text-lg text-foreground/80' : 'text-sm text-foreground/80'
        }`}
      >
        {link.label}
      </button>
    ));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link 
            to="/"
            className="flex flex-col items-start transition-opacity duration-200 hover:opacity-80"
          >
            <span className="text-2xl font-bold text-primary">PrePa</span>
            <span className="text-xs text-muted-foreground hidden sm:block">Tu camino a la universidad</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {renderNavLinks(false)}

            {isHomePage && <div className="h-4 w-px bg-border mx-2 hidden lg:block"></div>}

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground hidden lg:inline">
                  Hola, <span className="text-foreground">{currentUser?.name || 'Usuario'}</span>
                </span>
                <RolContextSwitcher />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notificaciones"
                  disabled
                  title="Notificaciones (próximamente)"
                  className="relative text-muted-foreground"
                >
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={getDashboardLink()}>
                    <LayoutDashboard className="mr-2 h-4 w-4 text-secondary" />
                    Mi Panel
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Cerrar Sesión</span>
                </Button>
              </div>
            ) : (
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
            )}
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-6 mt-8">
                <div className="flex flex-col items-start mb-4">
                  <span className="text-2xl font-bold text-primary">PrePa</span>
                  <span className="text-xs text-muted-foreground">Tu camino a la universidad</span>
                </div>
                
                {renderNavLinks(true)}

                <div className="h-px bg-border w-full my-2"></div>

                {isAuthenticated ? (
                  <div className="flex flex-col gap-4">
                    <span className="text-sm text-muted-foreground">
                      Sesión iniciada como <br/><strong className="text-foreground">{currentUser?.name || 'Usuario'}</strong>
                    </span>
                    <Button variant="outline" className="w-full justify-start" asChild onClick={() => setIsOpen(false)}>
                      <Link to={getDashboardLink()}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-secondary" />
                        Mi Panel
                      </Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" asChild onClick={() => setIsOpen(false)}>
                    <Link to="/login">Iniciar Sesión</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;