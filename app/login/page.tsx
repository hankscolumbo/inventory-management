// app/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/app/actions/register';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      // Handle Sign Up
      const res = await registerUser({ username, email, password });
      if (res.success) {
        // Auto-login after registration
        await signIn('credentials', { username, password, callbackUrl: '/' });
      } else {
        setError(res.error || 'Registration failed');
      }
    } else {
      // Handle Login
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid username or password');
      } else {
        router.push('/');
        router.refresh();
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-slate-900 border border-slate-800 rounded-2xl">
      <h1 className="text-2xl font-bold text-white mb-6 text-center">
        {isRegistering ? 'Create an Account' : 'Welcome Back'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm"
          />
        </div>

        {isRegistering && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl transition"
        >
          {isRegistering ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-px bg-slate-800 flex-1"></div>
        <span className="text-xs text-slate-500 font-semibold uppercase">Or</span>
        <div className="h-px bg-slate-800 flex-1"></div>
      </div>

      <button
        onClick={() => signIn('twitch', { callbackUrl: '/' })}
        className="mt-6 w-full bg-[#9146FF] hover:bg-[#a970ff] text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
      >
        Sign in with Twitch
      </button>

      <p className="mt-6 text-center text-sm text-slate-400">
        {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-purple-400 hover:underline font-semibold"
        >
          {isRegistering ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
}

