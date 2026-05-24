import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token || data.accessToken);
        navigate('/tracks', { replace: true });
      } else {
        alert('بيانات الدخول غير صحيحة. تأكد من الإيميل والباسورد.');
      }
    } catch (err) {
      console.error(err);
      alert('حصل خطأ في الاتصال بالسيرفر');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4 text-white font-sans">
      <div className="bg-[#161b2b] p-8 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 text-center">
          MockMate <span className="text-blue-500">Login</span>
        </h2>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Welcome back! Please enter your details.
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="text-xs text-gray-400">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-blue-500 hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                value={password}
                className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 pr-20 outline-none focus:border-blue-500 transition-all"
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 text-xs font-bold"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20">
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-500 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;