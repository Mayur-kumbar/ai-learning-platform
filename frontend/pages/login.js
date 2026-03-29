// pages/login.js

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

// ✅ use components (same UI, just moved)
import AuthLayout from "../components/AuthLayout";
import AuthForm from "../components/AuthForm";
import InputField from "../components/InputField";
import LoginPanel from "../components/LoginPanel";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth(); // ✅ backend connected

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(form.email, form.password); // ✅ REAL API
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      panel={<LoginPanel />}   // ✅ SAME UI
      form={
        <AuthForm
          title="Welcome back"
          subtitle="Sign in to continue your learning"
          onSubmit={handleSubmit}
          error={error}
          loading={loading}
          submitLabel="Sign in"
          footer={<>No account? <Link href="/register">Create one</Link></>}
        >
          <InputField
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@university.edu"
            autoComplete="email"
            required
          />

          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="eye-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '○' : '●'}
              </button>
            }
          />

          <div className="forgot-row">
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        </AuthForm>
      }
    />
  );
}