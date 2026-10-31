import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@brightloop.com');
  const [password, setPassword] = useState('Admin@12345');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const u = await login(email, password);
      toast.success('Signed in successfully');
      if (u.role === 'customer') navigate('/portal');
      else navigate('/app/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white border-2 border-ink p-8 w-full max-w-md space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-maroon">
            BRIGHTLOOP SECURITY
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-ink mt-1">
            Sign In
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-cream/30 border border-line text-xs focus:outline-none focus:border-maroon"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 bg-cream/30 border border-line text-xs focus:outline-none focus:border-maroon"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-maroon text-white text-xs font-bold uppercase tracking-widest hover:bg-maroonDeep transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-line text-center text-xs uppercase tracking-wider text-line">
          Need an account?{' '}
          <Link to="/register" className="text-maroon font-bold underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
