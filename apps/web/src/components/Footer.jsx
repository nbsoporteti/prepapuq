import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Instagram, Facebook, GraduationCap } from 'lucide-react';

const WHATSAPP_NUMBER = '+56 9 0000 0000'; // editable en el panel admin (PB) o hardcodear cuando esté
const WHATSAPP_URL = 'https://wa.me/56900000000'; // ídem
const EMAIL = 'contacto@prepapuq.cl';
const INSTAGRAM_URL = '#';
const FACEBOOK_URL = '#';

const Footer = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Marca + claim */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div className="leading-tight">
                <span className="block text-xl font-bold text-primary font-display">PrePa</span>
                <span className="block text-xs text-muted-foreground">Prepará tu futuro</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Preuniversitario PAES con sede en Punta Arenas. Acompañamos a estudiantes de
              Magallanes en su preparación para la educación superior, con profesores con
              nombre, apellido y resultados verificables.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors duration-base shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={INSTAGRAM_URL}
                aria-label="Instagram"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-base"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={FACEBOOK_URL}
                aria-label="Facebook"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-base"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Enlaces */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Navegación
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => scrollToSection('hero')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Inicio
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
                <button onClick={() => scrollToSection('modalidades')} className="text-muted-foreground hover:text-primary transition-colors duration-fast text-left">
                  Modalidades
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
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors duration-fast">
                  {WHATSAPP_NUMBER}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href={`mailto:${EMAIL}`} className="text-muted-foreground hover:text-primary transition-colors duration-fast">
                  {EMAIL}
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
            © {new Date().getFullYear()} PrePa — Operado en Punta Arenas, Magallanes <span aria-hidden="true">🐧</span>
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
