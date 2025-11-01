import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Crown, Settings, Bell, Shield, Key } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/customSupabaseClient';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/use-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    email_notifications: false,
    risk_profile: 'modéré',
    sensitivity_level: 5
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchProfile();
    fetchSettings();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          notifications_enabled: data.notifications_enabled !== false,
          email_notifications: data.email_notifications || false,
          risk_profile: data.risk_profile || 'modéré',
          sensitivity_level: data.sensitivity_level || 5
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: user.id,
          notifications_enabled: settings.notifications_enabled,
          email_notifications: settings.email_notifications,
          risk_profile: settings.risk_profile,
          sensitivity_level: settings.sensitivity_level,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Paramètres sauvegardés',
        description: 'Vos préférences ont été mises à jour avec succès.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres.',
        variant: 'destructive',
        duration: 3000
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  const isPremium = profile?.subscription_status === 'active';

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar profile={profile} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
              Mon Profil
            </h1>
            <p className="text-gray-400">
              Gérez vos informations et vos préférences
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-xl font-bold mb-1">{user.email?.split('@')[0]}</h2>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>

                {isPremium && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-yellow-500 mb-2">
                      <Crown className="w-5 h-5" />
                      <span className="font-bold">Membre Premium</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Accès illimité aux signaux et analyses avancées
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Email vérifié</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">
                      Membre depuis {new Date(profile?.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Compte sécurisé</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-red-500" />
                  Paramètres
                </h3>

                <div className="space-y-6">
                  {/* Notifications */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-400" />
                      Notifications
                    </h4>
                    <div className="space-y-3 pl-6">
                      <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                        <span className="text-sm">Notifications dans l'application</span>
                        <input
                          type="checkbox"
                          checked={settings.notifications_enabled}
                          onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                        <span className="text-sm">Notifications par email</span>
                        <input
                          type="checkbox"
                          checked={settings.email_notifications}
                          onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Risk Profile */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      Profil de Risque
                    </h4>
                    <div className="pl-6">
                      <select
                        value={settings.risk_profile}
                        onChange={(e) => setSettings({ ...settings, risk_profile: e.target.value })}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:outline-none"
                      >
                        <option value="conservateur">Conservateur</option>
                        <option value="modéré">Modéré</option>
                        <option value="agressif">Agressif</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {settings.risk_profile === 'conservateur' && 'Signaux à faible risque avec take-profit et stop-loss serrés'}
                        {settings.risk_profile === 'modéré' && 'Équilibre entre risque et rendement potentiel'}
                        {settings.risk_profile === 'agressif' && 'Signaux à haut rendement avec volatilité élevée'}
                      </p>
                    </div>
                  </div>

                  {/* Sensitivity Level */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      Sensibilité des Signaux
                    </h4>
                    <div className="pl-6">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={settings.sensitivity_level}
                          onChange={(e) => setSettings({ ...settings, sensitivity_level: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                        <span className="text-sm font-bold w-8 text-center">{settings.sensitivity_level}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Moins de signaux</span>
                        <span>Plus de signaux</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
