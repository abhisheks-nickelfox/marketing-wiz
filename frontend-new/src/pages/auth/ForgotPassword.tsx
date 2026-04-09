import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Key01 } from '@untitled-ui/icons-react';
import AuthLayout from '../../components/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    navigate('/reset-link-sent');
  };

  return (
    <AuthLayout>
      {/* Key icon */}
      <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center mb-6">
        <Key01 width={22} height={22} className="text-gray-600" />
      </div>

      {/* Heading */}
      <h1 className="text-[26px] font-semibold text-gray-900 mb-2">Forgot password?</h1>
      <p className="text-sm text-gray-500 mb-7">
        No worries, we'll send you reset instructions.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg py-2.5 transition-colors"
        >
          {loading ? 'Sending…' : 'Reset password'}
        </button>
      </form>

      {/* Back to login */}
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors mt-6"
      >
        <ArrowLeft width={16} height={16} />
        Back to log in
      </Link>
    </AuthLayout>
  );
}
