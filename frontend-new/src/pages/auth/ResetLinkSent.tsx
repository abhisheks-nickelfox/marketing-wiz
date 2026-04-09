import { Link } from 'react-router-dom';
import { Mail01 } from '@untitled-ui/icons-react';
import AuthLayout from '../../components/AuthLayout';

export default function ResetLinkSent() {
  return (
    <AuthLayout>
      {/* Mail icon */}
      <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center mb-6">
        <Mail01 width={22} height={22} className="text-gray-600" />
      </div>

      {/* Heading */}
      <h1 className="text-[26px] font-semibold text-gray-900 mb-3">
        Password reset link sent
      </h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        We've sent a password reset link to your email. Please check your inbox and
        follow the instructions to reset your password.
      </p>

      {/* Back to login */}
      <Link
        to="/login"
        className="inline-block mt-8 text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors"
      >
        Back to log in
      </Link>
    </AuthLayout>
  );
}
