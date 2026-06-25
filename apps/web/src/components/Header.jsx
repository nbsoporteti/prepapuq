import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, LayoutDashboard, MessageCircle, User, PenLine, Library } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import RolContextSwitcher from '@/components/shared/RolContextSwitcher.jsx';
import NotificationsBell from '@/components/notif/NotificationsBell.jsx';
import MessengerSheet from '@/components/mensajes/MessengerSheet.jsx';
import { useMessenger } from '@/hooks/useMessenger.js';
import { usePizarra } from '@/contexts/PizarraContext.jsx';

const DASHBOARD_POR_ROL = {
  estudiante: '/dashboard/estudiante',
  apoderado: '/dashboard/apoderado',
  profesor: '/dashboard/profesor',
  administrativo: '/dashboard/administrativo',
  admin: '/dashboard/admin',
};

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messengerOpen, setMessengerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, logout, rolActivo, rolesEffective } = useAuth();
  const { unreadTotal } = useMessenger(currentUser?.id);
  const { toggle: togglePizarra } = usePizarra();

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

  // Anclas de la landing institucional. Solo se muestran a visitantes
  // (no logueados) y solo en el home, donde existen esas secciones.
  const navLinks = [
    { label: 'Programas', sectionId: 'programas' },
    { label: 'Modalidades', sectionId: 'modalidades' },
    { label: 'Resultados', sectionId: 'resultados' },
    { label: 'Equipo', sectionId: 'equipo' },
  ];

  // Extracted navigation links to ensure a single source of truth
  const renderNavLinks = (isMobile = false) => {
    if (!isHomePage || isAuthenticated) return null;

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
            className="flex items-center transition-opacity duration-200 hover:opacity-80"
          >
            <img
              src="/logo.webp"
              alt="PrePa — Prepara tu futuro"
              className="h-11 w-auto shrink-0"
              width="44"
              height="44"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {renderNavLinks(false)}

            {!isAuthenticated && (
              <Link
                to="/clases-gratis"
                className="text-sm font-medium text-foreground/80 transition-colors duration-200 hover:text-primary"
              >
                Clases gratis
              </Link>
            )}

            {!isAuthenticated && <div className="h-4 w-px bg-border mx-2 hidden lg:block"></div>}

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <RolContextSwitcher />

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Mensajes"
                  className="relative text-muted-foreground hover:text-foreground"
                  onClick={() => setMessengerOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  {unreadTotal > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold px-1">
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir pizarra"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={togglePizarra}
                >
                  <PenLine className="h-4 w-4" />
                </Button>

                <NotificationsBell />

                <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
                  <Link to={getDashboardLink()}>
                    <LayoutDashboard className="mr-2 h-4 w-4 text-secondary" />
                    Mi panel
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {(currentUser?.name || currentUser?.email || '?').charAt(0).toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm">
                      <p className="font-medium truncate">{currentUser?.name || 'Usuario'}</p>
                      <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Mi panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/perfil">
                        <User className="h-4 w-4 mr-2" />
                        Mi perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/biblioteca">
                        <Library className="h-4 w-4 mr-2" />
                        Biblioteca PAES
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <MessengerSheet open={messengerOpen} onOpenChange={setMessengerOpen} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="text-foreground/80 hover:text-foreground">
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button
                  onClick={() => scrollToSection('contacto')}
                  className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                >
                  Admisión 2027
                </Button>
              </div>
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
                <div className="flex items-center mb-4">
                  <img
                    src="/logo.webp"
                    alt="PrePa — Prepara tu futuro"
                    className="h-11 w-auto shrink-0"
                    width="44"
                    height="44"
                  />
                </div>
                
                {renderNavLinks(true)}

                {!isAuthenticated && (
                  <Link
                    to="/clases-gratis"
                    onClick={() => setIsOpen(false)}
                    className="text-left text-lg font-medium text-foreground/80 transition-colors hover:text-primary"
                  >
                    Clases gratis
                  </Link>
                )}

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
                    <Button variant="outline" className="w-full justify-start" asChild onClick={() => setIsOpen(false)}>
                      <Link to="/biblioteca">
                        <Library className="mr-2 h-4 w-4 text-primary" />
                        Biblioteca PAES
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        togglePizarra();
                        setIsOpen(false);
                      }}
                    >
                      <PenLine className="mr-2 h-4 w-4 text-primary" />
                      Pizarra
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                      onClick={() => scrollToSection('contacto')}
                    >
                      Admisión 2027
                    </Button>
                    <Button variant="outline" className="w-full" asChild onClick={() => setIsOpen(false)}>
                      <Link to="/login">Iniciar sesión</Link>
                    </Button>
                  </div>
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