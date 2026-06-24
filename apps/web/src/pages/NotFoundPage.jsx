import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Home, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Footer from '@/components/Footer.jsx';

const DASHBOARD_POR_ROL = {
  estudiante: '/dashboard/estudiante',
  apoderado: '/dashboard/apoderado',
  profesor: '/dashboard/profesor',
  administrativo: '/dashboard/administrativo',
  admin: '/dashboard/admin',
};

const NotFoundPage = () => {
  const { rolActivo, rolesEffective, isAuthenticated } = useAuth();
  const dashboardHref = (rolActivo && DASHBOARD_POR_ROL[rolActivo])
    || (rolesEffective?.[0] && DASHBOARD_POR_ROL[rolesEffective[0]])
    || '/';

  return (
    <>
      <Helmet><title>Página no encontrada | PrePa</title></Helmet>

      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <p className="font-mono text-7xl md:text-9xl font-bold tabular-nums text-primary leading-none mb-2">
            404
          </p>
          <span className="inline-block h-1 w-16 bg-accent rounded-full mb-6" />

          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3 text-balance">
            No encontramos esta página
          </h1>
          <p className="text-muted-foreground mb-8">
            Tal vez el enlace está mal copiado, o la sección que buscás todavía no existe.
            Volvé a tu panel o escribinos si necesitás algo puntual.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to={isAuthenticated ? dashboardHref : '/'}>
                <Home className="h-4 w-4 mr-2" />
                {isAuthenticated ? 'Ir a mi panel' : 'Ir al inicio'}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="https://wa.me/56900000000" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2 text-success" />
                WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:contacto@prepapuq.cl">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default NotFoundPage;
