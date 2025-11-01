import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError('Veuillez accepter les conditions');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password);
      if (error) throw error;

      setSuccess(true);
      setTimeout(() => navigate('/app'), 2000);
    } catch (error) {
      setError(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-red-900/10 to-black"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-red-500 to-white bg-clip-text text-transparent">
              NEURA TRADE AI
            </h1>
          </Link>
          <h2 className="text-2xl font-bold mb-2">Créer un compte</h2>
          <p className="text-gray-400">Accédez à l'IA de trading crypto</p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-green-500/20 rounded-2xl p-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Compte créé avec succès !</h3>
            <p className="text-gray-400 mb-6">
              Vous allez être redirigé vers votre dashboard...
            </p>
          </motion.div>
        ) : (
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
                  Email *
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
                  Mot de passe * <span className="text-gray-500 text-xs">(min. 8 caractères)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-11 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="text-left">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-red-500"
                    required
                  />
                  <span className="text-sm text-gray-400">
                    J'accepte les <Link to="/legal#cgv" className="text-red-500 hover:underline">conditions générales</Link> et
                    la <Link to="/legal#privacy" className="text-red-500 hover:underline">politique de confidentialité</Link>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 text-white font-bold rounded-full transition-all duration-300 shadow-lg shadow-red-500/50 hover:shadow-red-500/80 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? 'Création du compte...' : 'Créer mon compte'}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-400">Déjà un compte ? </span>
              <Link to="/login" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
                Se connecter
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/" className="hover:text-gray-400 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
