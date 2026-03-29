// pages/register.js

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

import AuthLayout from "../components/AuthLayout";
import AuthForm from "../components/AuthForm";
import InputField from "../components/InputField";

const ROLES = [
  { value: 'student',    label: 'Student',    desc: 'Learn from lectures & quizzes' },
  { value: 'instructor', label: 'Instructor', desc: 'Upload & manage course content' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth(); // ✅ backend connected

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(form); // ✅ real API
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      panel={<RegisterPanel />} // ✅ SAME Claude UI
      form={
        <AuthForm
          title="Create account"
          subtitle="Join the AI-powered learning platform"
          onSubmit={handleSubmit}
          error={error}
          loading={loading}
          submitLabel="Create account"
          footer={<>Already have an account? <Link href="/login">Sign in</Link></>}
        >
          <InputField
            label="Full name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ada Lovelace"
            autoComplete="name"
            required
          />

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
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            required
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="eye-btn"
              >
                {showPassword ? '○' : '●'}
              </button>
            }
          />

          {/* Role selector (UNCHANGED UI) */}
          <div className="field-group">
            <label className="field-label">I am a</label>
            <div className="role-grid">
              {ROLES.map(r => (
                <label key={r.value} className={`role-card ${form.role === r.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className="role-name">{r.label}</span>
                  <span className="role-desc">{r.desc}</span>
                </label>
              ))}
            </div>
          </div>

        </AuthForm>
      }
    />
  );
}

/* ✅ EXACT CLAUDE UI PANEL (unchanged) */
function RegisterPanel() {
  return (
    <div className="panel-content">
      
      <div className="panel-brand">
        <span className="brand-mark">⬡</span>
        <span className="brand-name">Cognify</span>
      </div>

      <div className="panel-copy">
        <h1 className="panel-headline">
          Learn smarter with <em>AI-powered insights</em>
        </h1>
        <p className="panel-body">
          Personalized learning, real-time feedback, and adaptive quizzes — all in one platform.
        </p>
      </div>

      <div className="panel-art register-art">
        <div className="ai-orb"></div>
      </div>

    </div>
  );
}