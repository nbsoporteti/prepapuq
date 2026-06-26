import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { SITE } from '@/lib/site';

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // El footer aparece en varias páginas (home, clases-gratis, 404). Si no
  // estamos en el home, navegamos a /#id y el HomePage hace el scroll al
  // montar; si ya estamos en el home, scrolleamos directo.
  const scrollToSection = (sectionId) => {
    if (location.pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Marca + claim */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center mb-4">
              <img
                src="/logo.webp"
                alt="PrePa — Prepara tu futuro"
                className="h-20 w-auto"
                width="80"
                height="80"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Preuniversitario PAES con sede en Punta Arenas. Acompañamos a estudiantes de
              Magallanes en su preparación para la educación superior, con profesores con
              nombre, apellido y resultados verificables.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href={SITE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors duration-base shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              {SITE.instagram && (
                <a
                  href={SITE.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-base"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {SITE.facebook && (
                <a
                  href={SITE.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-base"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Enlaces */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Navegación
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => scrollToSection('inicio')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Inicio
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('programas')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Programas
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('modalidades')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Modalidades
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('resultados')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Resultados PAES
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('equipo')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Equipo docente
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('contacto')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Contacto
                </button>
              </li>
              <li>
                <Link to="/clases-gratis" className="text-muted-foreground hover:text-primary transition-colors duration-fast">
                  Clases gratuitas
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors duration-fast">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div className="md:col-span-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Contacto
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  Punta Arenas, Región de Magallanes y Antártica Chilena
                </span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                <a href={SITE.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors duration-fast">
                  {SITE.whatsappNumero}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href={`mailto:${SITE.email}`} className="text-muted-foreground hover:text-primary transition-colors duration-fast">
                  {SITE.email}
                </a>
              </li>
            </ul>

            <div className="mt-5 p-3 rounded-xl bg-muted text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Horario de atención</strong><br />
              Lunes a viernes · 09:00 – 19:00 hrs<br />
              Sábados · 10:00 – 13:00 hrs
            </div>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="border-t mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PrePa — Operado en Punta Arenas, Magallanes
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-fast">
              Privacidad
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-fast">
              Términos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
