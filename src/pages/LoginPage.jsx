import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      navigate('/dashboard');
    } catch (error) {
      setError(error.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-red-900/10 to-black"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-block mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-red-500 to-white bg-clip-text text-transparent">
              NEURA TRADE AI
            </h1>
          </Link>
          <h2 className="text-2xl font-bold mb-2">Connexion</h2>
          <p className="text-gray-400">Accédez à votre espace IA</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-white"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-red-500" />
                <span className="text-gray-400">Se souvenir de moi</span>
              </label>
              <Link to="/reset-password" className="text-red-500 hover:text-red-400 transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 text-white font-bold rounded-full transition-all duration-300 shadow-lg shadow-red-500/50 hover:shadow-red-500/80 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">Pas encore de compte ? </span>
            <Link to="/register" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
              Créer un compte
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/landing" className="hover:text-gray-400 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
