import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    interes: '',
    mensaje: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, interes: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowSuccess(false);

    try {
      await pb.collection('leads').create({
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        interes: formData.interes || null,
        mensaje: formData.mensaje || null
      }, { $autoCancel: false });

      setShowSuccess(true);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        interes: '',
        mensaje: ''
      });
      
      toast.success('Consulta enviada correctamente');
    } catch (error) {
      console.error('Error al enviar consulta:', error);
      toast.error('Error al enviar la consulta. Por favor, intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {showSuccess && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary rounded-lg">
          <p className="text-primary font-medium">
            Gracias! Nos pondremos en contacto contigo a la brevedad
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-sm font-medium">
            Nombre completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full text-foreground"
            placeholder="Ingresa tu nombre completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Correo electrónico <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full text-foreground"
            placeholder="tu@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono" className="text-sm font-medium">
            Teléfono <span className="text-destructive">*</span>
          </Label>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            value={formData.telefono}
            onChange={handleChange}
            required
            className="w-full text-foreground"
            placeholder="+56 9 XXXX XXXX"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interes" className="text-sm font-medium">
            Área de interés
          </Label>
          <Select value={formData.interes} onValueChange={handleSelectChange}>
            <SelectTrigger id="interes" className="w-full">
              <SelectValue placeholder="Selecciona un área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Matemática">Matemática</SelectItem>
              <SelectItem value="Lenguaje">Lenguaje</SelectItem>
              <SelectItem value="Ciencias">Ciencias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mensaje" className="text-sm font-medium">
            Mensaje adicional
          </Label>
          <Textarea
            id="mensaje"
            name="mensaje"
            value={formData.mensaje}
            onChange={handleChange}
            rows={4}
            className="w-full resize-none text-foreground"
            placeholder="¿Tienes alguna pregunta o comentario?"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full transition-all duration-200 active:scale-[0.98]"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Consulta'}
        </Button>
      </form>
    </div>
  );
};

export default ContactForm;