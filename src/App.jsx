import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom';

import Tracks from './pages/Tracks';
import Skills from './pages/Skills';
import Questions from './pages/Questions';
import Interviews from './pages/Interviews';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/tracks" replace />;
  return children;
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const hideSidebar = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  if (hideSidebar) return null;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const menu = [
    { name: 'Interviews', path: '/interviews' },
    { name: 'Tracks', path: '/tracks' },
    { name: 'Skills', path: '/skills'},
    { name: 'Questions', path: '/questions' },
     // <-- مهم
  ];

  return (
    <div className="w-80 bg-[#161b2b] h-screen fixed left-0 top-0 border-r-4 border-gray-900 flex flex-col z-50">
      <div className="p-10 mb-10">
        <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
          MOCK<span className="text-blue-500">MATE</span>
        </h2>
        <p className="text-[9px] font-bold text-gray-500 tracking-[0.4em] uppercase mt-4">
          Admin Management
        </p>
      </div>

      <nav className="flex-1 px-8 space-y-4">
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-6 px-8 py-6 rounded-[2.5rem] font-black text-[11px] tracking-widest uppercase transition-all duration-300 ${
              location.pathname === item.path
                ? 'bg-blue-600 text-white shadow-[0_15px_40px_rgba(37,99,235,0.25)] scale-105'
                : 'text-white hover:bg-white/5 hover:translate-x-2'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-10 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-4 py-5 rounded-[1.8rem] bg-red-600/10 border-2 border-red-600/20 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-xl"
        >
           Logout
        </button>
      </div>
    </div>
  );
};

function AppShell() {
  const location = useLocation();
  const hideSidebar = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  return (
    <div className="flex bg-[#0b0f1a] min-h-screen text-white font-sans selection:bg-blue-600/30">
      <Sidebar />

      <main className={`flex-1 transition-all duration-500 ${!hideSidebar ? 'ml-80' : ''}`}>
        <div className="p-10 max-w-7xl mx-auto min-h-screen">
          <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

            {/* Protected */}
            <Route path="/tracks" element={<ProtectedRoute><Tracks /></ProtectedRoute>} />
            <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
            <Route path="/questions" element={<ProtectedRoute><Questions /></ProtectedRoute>} />
            <Route path="/interviews" element={<ProtectedRoute><Interviews /></ProtectedRoute>} />

            {/* Default */}
            <Route path="*" element={<Navigate to="/tracks" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}