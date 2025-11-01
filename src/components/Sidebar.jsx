import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Activity, History, User, LogOut, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';

export default function Sidebar({ profile }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isPremium = profile?.subscription_status === 'active';

  const menuItems = [
    { icon: Home, label: 'Accueil', path: '/app', exact: true },
    { icon: Activity, label: 'Analyse Live', path: '/app/analysis' },
    { icon: History, label: 'Historique', path: '/app/history' },
    { icon: User, label: 'Mon Profil', path: '/app/profile' },
  ];

  const isActive = (path, exact) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 lg:w-64 md:w-20 sm:w-16 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0 transition-all">
      {/* Logo */}
      <div className="p-6 md:p-4 sm:p-2 border-b border-gray-800">
        <Link to="/" className="block">
          <h1 className="text-xl md:text-sm font-bold bg-gradient-to-r from-white via-red-500 to-white bg-clip-text text-transparent md:hidden">
            NEURA TRADE AI
          </h1>
          <h1 className="text-xl font-bold text-red-500 hidden md:block">NT</h1>
          <p className="text-xs text-gray-500 mt-1 md:hidden">Intelligence Artificielle</p>
        </Link>
      </div>

      {/* Premium Badge */}
      {isPremium && (
        <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-500">
            <Crown className="w-5 h-5" />
            <span className="font-bold text-sm">PREMIUM</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Accès illimité aux signaux
          </p>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive(item.path, item.exact)
                ? 'bg-red-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium md:hidden">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Upgrade CTA (if not premium) */}
      {!isPremium && (
        <div className="m-4 md:m-2 p-4 md:p-2 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg md:hidden">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-red-500" />
            <span className="font-bold text-sm">Passez à Premium</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Signaux illimités, analyses avancées
          </p>
          <Link
            to="/pricing"
            className="block w-full px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold rounded-lg text-center hover:shadow-lg transition-all"
          >
            Découvrir
          </Link>
        </div>
      )}

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium md:hidden">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
