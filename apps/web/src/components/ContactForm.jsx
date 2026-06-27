import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import pb from '@/lib/pocketbaseClient';
import { getUtmParams, getReferer } from '@/lib/utm';

// Validación del lead antes de mandarlo a PocketBase (HTML5 cubre los vacíos;
// Zod agrega formato: email válido, teléfono plausible, largos máximos).
const leadSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresá tu nombre completo').max(100, 'Demasiado largo'),
  telefono: z
    .string()
    .trim()
    .min(8, 'Ingresá un teléfono válido')
    .max(20, 'Teléfono demasiado largo')
    .regex(/^[+\d][\d\s()-]{6,}$/, 'Teléfono inválido'),
  email: z.string().trim().email('Correo inválido').max(150),
  interes: z.string().max(50).optional().or(z.literal('')),
  mensaje: z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
});

const ContactForm = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    interes: '',
    mensaje: '',
    honeypot: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({ ...prev, interes: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowSuccess(false);

    // Si el honeypot trae algo, es un bot: simular éxito sin guardar.
    if (formData.honeypot) {
      setShowSuccess(true);
      setIsSubmitting(false);
      return;
    }

    const parsed = leadSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])));
      toast.error('Revisá los datos del formulario');
      setIsSubmitting(false);
      return;
    }
    setErrors({});

    try {
      const utm = getUtmParams();
      await pb.collection('leads').create({
        nombre: parsed.data.nombre,
        email: parsed.data.email,
        telefono: parsed.data.telefono,
        interes: parsed.data.interes || null,
        mensaje: parsed.data.mensaje || null,
        utm_source: utm.utm_source || '',
        utm_medium: utm.utm_medium || '',
        utm_campaign: utm.utm_campaign || '',
        utm_term: utm.utm_term || '',
        utm_content: utm.utm_content || '',
        referer: getReferer(),
        estado_seguimiento: 'nuevo',
      }, { $autoCancel: false });

      setShowSuccess(true);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        interes: '',
        mensaje: '',
        honeypot: '',
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
        <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">¡Gracias por escribirnos!</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Te vamos a contactar en las próximas 24 horas hábiles.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot — campo oculto. Si un bot lo llena, descartamos el submit. */}
        <div className="absolute -left-[9999px] pointer-events-none" aria-hidden="true">
          <Label htmlFor="company">No completar</Label>
          <Input
            id="company"
            name="honeypot"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formData.honeypot}
            onChange={handleChange}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
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
              placeholder="Ej: María Pérez"
            />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
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
            {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
          </div>
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
            placeholder="tucorreo@ejemplo.cl"
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interes" className="text-sm font-medium">
            Área de interés
          </Label>
          <Select value={formData.interes} onValueChange={handleSelectChange}>
            <SelectTrigger id="interes" className="w-full">
              <SelectValue placeholder="¿Qué materia te interesa más?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Matemática">Matemática (M1 y M2)</SelectItem>
              <SelectItem value="Lenguaje">Competencia Lectora</SelectItem>
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
            placeholder="¿Tu hijo/a entra a 4° medio? ¿Querés más info de horarios? Contanos."
          />
          {errors.mensaje && <p className="text-xs text-destructive">{errors.mensaje}</p>}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-base active:scale-[0.98]"
        >
          {isSubmitting ? 'Enviando...' : 'Quiero más información'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Al enviar aceptás que te contactemos por email, teléfono o WhatsApp para responder tu consulta.
        </p>
      </form>
    </div>
  );
};

export default ContactForm;
