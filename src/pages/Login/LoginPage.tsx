import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AlertBanner } from '../../components/common/AlertBanner';
import { authService } from '../../services/authService';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginDemo, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSupabaseReady = authService.isConfigured();

  const handleGoogleLogin = async () => {
    setLocalError(null);
    try {
      await loginWithGoogle();
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

  const handleDemoLogin = () => {
    loginDemo();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto text-center">
        {/* Back link */}
        <div className="text-left mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Logo and title */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="Raksha Logo" className="w-12 h-12 mb-3 drop-shadow-md" />
          <h2 className="text-2xl font-black tracking-tight text-white">Citizen Access</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access emergency safety services & trusted dispatch
          </p>
        </div>

        {/* Supabase status banner if not configured */}
        {!isSupabaseReady && (
          <AlertBanner
            type="info"
            title="Development / Demo Mode Active"
            message="Supabase credentials are not populated in .env. You can log in instantly with the pre-seeded Demo Citizen profile below."
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

        {/* 1. Reviewer / Demo Quick Access Button */}
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-500/30 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Instant Reviewer Access
            </span>
            <span className="text-[10px] text-slate-400">Zero Setup Required</span>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            Load demo account with simulated location, contacts & response dispatch:
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full font-bold shadow-md"
            onClick={handleDemoLogin}
          >
            Sign In as Demo Citizen (Priya Sharma)
          </Button>
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-[#080c14] px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Or Sign In with Supabase
          </span>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full mb-4 bg-slate-900/80 border-slate-700 hover:bg-slate-800"
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

        <p className="text-xs text-slate-500 mt-6">
          By signing in, you confirm your consent for emergency dispatch telemetry and priority location sharing during active SOS alerts.
        </p>
      </div>
    </div>
  );
};
