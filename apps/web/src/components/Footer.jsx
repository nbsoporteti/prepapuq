import React from 'react';
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-muted text-muted-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex flex-col items-start mb-4">
              <span className="text-2xl font-bold text-primary">PrePa</span>
              <span className="text-sm">Tu camino a la universidad</span>
            </div>
            <p className="text-sm leading-relaxed">
              Preuniversitario en Punta Arenas con clases presenciales y online. Preparamos estudiantes para su ingreso exitoso a la educación superior.
            </p>
          </div>

          <div>
            <span className="font-semibold text-foreground mb-4 block">Enlaces rápidos</span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => scrollToSection('hero')}
                className="text-sm hover:text-primary transition-colors duration-200 text-left"
              >
                Inicio
              </button>
              <button
                onClick={() => scrollToSection('cursos')}
                className="text-sm hover:text-primary transition-colors duration-200 text-left"
              >
                Cursos
              </button>
              <button
                onClick={() => scrollToSection('contacto')}
                className="text-sm hover:text-primary transition-colors duration-200 text-left"
              >
                Contacto
              </button>
            </div>
          </div>

          <div>
            <span className="font-semibold text-foreground mb-4 block">Contacto</span>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Punta Arenas, Región de Magallanes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span>+56 9 XXXX XXXX</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>contacto@prepa.cl</span>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">
                <Youtube className="h-5 w-5" />
                <span className="sr-only">YouTube</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2026 PrePa. Todos los derechos reservados.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-primary transition-colors duration-200">
              Política de Privacidad
            </a>
            <a href="#" className="hover:text-primary transition-colors duration-200">
              Términos de Servicio
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;