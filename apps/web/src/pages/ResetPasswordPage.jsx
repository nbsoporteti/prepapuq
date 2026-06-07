import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await pb
        .collection('users')
        .confirmPasswordReset(token, password, passwordConfirm, { $autoCancel: false });
      toast.success('Contraseña actualizada. Iniciá sesión con la nueva.');
      navigate('/login');
    } catch (error) {
      console.error('Confirm password reset error:', error);
      setErrorMsg(
        'El enlace de recuperación expiró o no es válido. Solicitá uno nuevo desde la pantalla de login.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Enlace inválido</h3>
              <p className="text-sm text-muted-foreground">
                Este enlace no contiene un token de recuperación. Volvé a solicitar uno desde el login.
              </p>
            </div>
            <Button asChild>
              <Link to="/login">Volver al login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Restablecer contraseña | PrePa</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Restablecer contraseña
            </CardTitle>
            <CardDescription className="text-base">
              Elegí una nueva contraseña para tu cuenta.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium">
                  Nueva contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="font-medium">
                  Confirmar contraseña
                </Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="Repetí la contraseña"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  className="text-foreground"
                />
              </div>

              <Button type="submit" className="w-full py-6" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ResetPasswordPage;
