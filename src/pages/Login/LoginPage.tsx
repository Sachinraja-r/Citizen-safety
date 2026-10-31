import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AlertBanner } from '../../components/common/AlertBanner';
import { authService } from '../../services/authService';
import { ArrowLeft } from 'lucide-react';
import { RakshaLogo } from '../../components/common/RakshaLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSupabaseReady = authService.isConfigured();

  const handleGoogleLogin = async () => {
    setLocalError(null);
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        navigate(loggedUser.isOnboarded ? '/app' : '/onboarding');
      }
    } catch (err: unknown) {
      setLocalError((err as Error).message);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setLocalError(null);

    const { user, error } = await authService.signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      setLocalError(error.message);
      return;
    }
    if (user) {
      navigate(user.isOnboarded ? '/app' : '/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8] text-[#2D1B24] flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto text-center">
        {/* Back link */}
        <div className="text-left mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-[#7A6570] hover:text-[#E91E63] transition-colors font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Logo and title */}
        <div className="flex flex-col items-center mb-6">
          <RakshaLogo variant="full" size="lg" className="mb-2" />
          <h2 className="text-2xl font-black tracking-tight text-[#2D1B24]">Citizen Access</h2>
          <p className="text-xs text-[#7A6570] mt-1">
            Sign in to access emergency safety services &amp; trusted dispatch
          </p>
        </div>

        {/* Supabase status banner if not configured */}
        {!isSupabaseReady && (
          <AlertBanner
            type="info"
            title="Supabase Not Connected"
            message="Supabase credentials are not populated in environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live authentication."
            className="mb-5"
          />
        )}

        {(localError || authError) && (
          <AlertBanner
            type="error"
            title="Authentication Error"
            message={localError || authError || 'Failed to authenticate'}
            className="mb-5"
          />
        )}

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full mb-4 bg-white border-[#F3D9E2] hover:bg-[#FFF5F8] text-[#2D1B24] shadow-sm"
          onClick={handleGoogleLogin}
          leftIcon={
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          }
        >
          Continue with Google
        </Button>

        {/* Email/Password form */}
        <form onSubmit={handleEmailLogin} className="space-y-3.5">
          <Input
            type="email"
            label="Email Address"
            placeholder="citizen@emergency.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isSupabaseReady}
          />

          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!isSupabaseReady}
          />

          <Button
            type="submit"
            variant="secondary"
            size="md"
            className="w-full font-semibold"
            isLoading={loading}
            disabled={!isSupabaseReady}
          >
            Sign In with Email
          </Button>
        </form>

        <p className="text-xs text-[#7A6570] mt-6">
          By signing in, you confirm your consent for emergency dispatch telemetry and priority location sharing during active SOS alerts.
        </p>
      </div>
    </div>
  );
};
