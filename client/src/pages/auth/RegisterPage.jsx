import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(email, password);
      toast.success('Registration successful');
      navigate('/portal');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white border-2 border-ink p-8 w-full max-w-md space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-maroon">
            CUSTOMER ENROLLMENT
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-ink mt-1">
            Create Account
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
              Work Email
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
              Password (Min 8 chars, 1 uppercase, 1 digit, 1 special)
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
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <div className="pt-4 border-t border-line text-center text-xs uppercase tracking-wider text-line">
          Already registered?{' '}
          <Link to="/login" className="text-maroon font-bold underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
