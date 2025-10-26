
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Bell, Shield } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from './ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AiControlPanel = ({ settings, setSettings }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isUpdating, setIsUpdating] = useState(false);

    const updateSettings = async (key, value) => {
        if (!user || isUpdating) return;
        
        setIsUpdating(true);
        const oldSettings = { ...settings };
        setSettings(prev => ({...prev, [key]: value}));

        const { error } = await supabase.from('settings').update({ [key]: value }).eq('user_id', user.id);

        setIsUpdating(false);

        if (error) {
            setSettings(oldSettings);
            toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
        } else {
            toast({ title: "Paramètres sauvegardés", description: "Vos préférences ont été mises à jour." });
        }
    };

    return (
        <motion.div
            className="glass-effect rounded-xl p-6 space-y-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <h3 className="text-xl font-bold">Panneau de Contrôle IA</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><SlidersHorizontal className="w-5 h-5" /> Sensibilité</span>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(level => (
                            <button
                                key={level}
                                onClick={() => updateSettings('sensitivity_level', level)}
                                className={`w-8 h-8 rounded-md transition-all ${settings.sensitivity_level >= level ? 'bg-blue-500' : 'bg-secondary'}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><Bell className="w-5 h-5" /> Notifications</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings.notifications_enabled} onChange={(e) => updateSettings('notifications_enabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><Shield className="w-5 h-5" /> Profil de Risque</span>
                    <select
                        value={settings.risk_profile}
                        onChange={(e) => updateSettings('risk_profile', e.target.value)}
                        className="bg-secondary border-none rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="prudent">Prudent</option>
                        <option value="modéré">Modéré</option>
                        <option value="agressif">Agressif</option>
                    </select>
                </div>
            </div>
            <div className="text-center text-xs text-muted-foreground pt-4 border-t border-white/10">
                L'IA analyse le marché en continu. Les nouveaux signaux apparaissent automatiquement.
            </div>
        </motion.div>
    );
};

export default AiControlPanel;
