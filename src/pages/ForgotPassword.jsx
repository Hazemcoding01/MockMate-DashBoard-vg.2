import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleReset = (e) => {
    e.preventDefault();
    // هنا بننادي الـ API لما الشباب يخلصوه
    alert(`We've sent a reset link to: ${email} (If the API was ready!)`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4 text-white font-sans">
      <div className="bg-[#161b2b] p-8 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <span className="text-2xl">🔑</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
          <p className="text-gray-400 text-sm">No worries, we'll send you reset instructions.</p>
        </div>
        
        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1 ml-1">Email Address</label>
            <input 
              type="email" placeholder="Enter your email" required 
              className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-xl transition-all">
            Reset Password
          </button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-sm">
          <Link to="/login" className="text-gray-300 hover:text-white inline-flex items-center gap-2 transition-colors">
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;