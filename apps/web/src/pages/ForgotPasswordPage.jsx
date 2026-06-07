import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await pb.collection('users').requestPasswordReset(email, { $autoCancel: false });
      setSubmitted(true);
      toast.success('Si el correo existe, te enviamos las instrucciones.');
    } catch (error) {
      console.error('Password reset error:', error);
      setSubmitted(true);
      toast.success('Si el correo existe, te enviamos las instrucciones.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Recuperar contraseña | PrePa</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" asChild className="mb-4 -ml-3 text-muted-foreground hover:text-foreground">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al login
            </Link>
          </Button>

          <Card className="shadow-lg">
            <CardHeader className="space-y-2 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto sm:mx-0">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Recuperar contraseña
              </CardTitle>
              <CardDescription className="text-base">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {submitted ? (
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Revisa tu correo</h3>
                    <p className="text-sm text-muted-foreground">
                      Si la dirección está registrada, te llegará un enlace en los próximos minutos.
                      Si no lo encontrás, revisá también la carpeta de spam.
                    </p>
                  </div>
                  <Button variant="outline" asChild className="mt-2">
                    <Link to="/login">Volver al login</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium">
                      Correo electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@correo.cl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-foreground"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-6"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
