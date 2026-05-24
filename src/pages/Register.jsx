import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // إضافة State للمفتاح السري 🔑
  const [adminKey, setAdminKey] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const toastTimerRef = useRef(null);

  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // 1. التحقق من الـ Admin Key السري قبل أي خطوة وقبل ما نكلم السيرفر 🚨
if (btoa(adminKey) !== 'TW9ja01hdGVBZG1pbjIwMjY=') {
        showNotification('عذراً، كود التحقق الخاص بالمشرفين غير صحيح! لا يمكنك إنشاء الحساب.', 'error');
      return;
    }

    if (formData.password !== confirmPassword) {
      showNotification('Passwords do not match!', 'error');
      return;
    }

    if (formData.password.length < 6) {
      showNotification('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'Admin' }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        showNotification('Account created successfully!', 'success');
        setTimeout(() => navigate('/login', { replace: true }), 1200);
      } else {
        const msg =
          data?.validationErrors?.Email?.[0] ||
          data?.validationErrors?.email?.[0] ||
          data?.message ||
          'Registration failed';
        showNotification(msg, 'error');
      }
    } catch (err) {
      showNotification('Connection error, please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4 text-white font-sans relative overflow-hidden">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-50 transition-all border ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500 text-green-500'
              : 'bg-red-500/10 border-red-500 text-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="bg-[#161b2b] p-8 rounded-[2.5rem] border border-gray-800 w-full max-w-lg shadow-2xl relative z-10">
        <h2 className="text-3xl font-bold mb-2 text-center">
          Join <span className="text-blue-500">MockMate</span>
        </h2>
        <p className="text-gray-400 text-center mb-8 text-sm">Create your Admin account</p>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="username"
            type="text"
            placeholder="Username"
            required
            value={formData.username}
            onChange={handleChange}
            className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white"
          />

          <input
            name="displayName"
            type="text"
            placeholder="Full Name"
            required
            value={formData.displayName}
            onChange={handleChange}
            className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white"
          />

          <div className="md:col-span-2">
            <input
              name="email"
              type="email"
              placeholder="example@mail.com"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white"
            />
          </div>

          <div className="md:col-span-2">
            <input
              name="phoneNumber"
              type="text"
              placeholder="Phone Number (e.g. +201...)"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white"
            />
          </div>

          {/* إضافة حقل الـ Admin Verification Key السري هنا بالشكل المتناسق 🔑 */}
          <div className="md:col-span-2">
            <input
              type="password"
              placeholder="Admin Verification Key"
              required
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full bg-[#0b0f1a] border border-red-500/30 focus:border-red-500 rounded-xl px-4 py-3 outline-none transition-all text-white placeholder:text-gray-500"
            />
          </div>

          <div className="relative md:col-span-2">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-3.5 text-blue-500 text-xs font-bold"
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          <div className="md:col-span-2">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white"
            />
          </div>

          <button
            disabled={loading}
            className={`md:col-span-2 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 mt-4 ${
              loading ? 'bg-blue-600/60 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;