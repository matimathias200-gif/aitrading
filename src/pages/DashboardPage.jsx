import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Activity, DollarSign, AlertCircle, Lock, Crown } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/customSupabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import LiveSignals from '../components/LiveSignals';
import Sidebar from '../components/Sidebar';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If profile doesn't exist, create it
      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            plan: 'free',
            subscription_status: 'inactive'
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = profile?.subscription_status === 'active';

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <Sidebar profile={profile} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold mb-2">
            Bienvenue sur votre Dashboard IA
          </h2>
          <p className="text-gray-400">
            Accédez aux signaux de trading générés par notre intelligence artificielle propriétaire
          </p>
        </motion.div>

        {/* Premium Upgrade Banner */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Crown className="w-12 h-12 text-yellow-500" />
                <div>
                  <h3 className="text-xl font-bold mb-1">Passez à Premium</h3>
                  <p className="text-gray-400 text-sm">
                    Accédez à tous les signaux en temps réel et aux analyses avancées
                  </p>
                </div>
              </div>
              <Link
                to="/pricing"
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-full hover:shadow-lg hover:shadow-red-500/50 transition-all"
              >
                Voir les Plans
              </Link>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: TrendingUp, label: 'Signaux Actifs', value: isPremium ? '12' : '3', color: 'text-green-500' },
            { icon: Zap, label: 'Précision Moyenne', value: '98.7%', color: 'text-blue-500' },
            { icon: Activity, label: 'Trades Aujourd\'hui', value: isPremium ? '8' : '2', color: 'text-purple-500' },
            { icon: DollarSign, label: 'ROI Estimé', value: isPremium ? '+24%' : '+12%', color: 'text-yellow-500' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-red-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                {!isPremium && index > 0 && (
                  <Lock className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Live Signals Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <LiveSignals isPremium={isPremium} />
        </motion.div>

        {/* Free Plan Limitation */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center"
          >
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Débloquez Tous les Signaux</h3>
            <p className="text-gray-400 mb-6">
              Le plan gratuit vous donne accès à 3 signaux. Passez à Premium pour accéder
              à tous les signaux en temps réel, analyses avancées et notifications instantanées.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/pricing"
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all"
              >
                Voir les Plans Premium
              </Link>
              <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-full transition-all">
                En savoir plus
              </button>
            </div>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
}
