import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, DollarSign, Shield, Bell, Key, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';

const SettingsPanel = ({ capital, setCapital }) => {
  const [localCapital, setLocalCapital] = useState(capital);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const { toast } = useToast();

  const handleSave = () => {
    setCapital(localCapital);
    localStorage.setItem('trading_capital', localCapital.toString());
    localStorage.setItem('risk_per_trade', riskPerTrade.toString());
    
    toast({
      title: "Paramètres sauvegardés",
      description: "Vos configurations ont été mises à jour avec succès",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold gradient-text">Paramètres</h2>
        <p className="text-muted-foreground mt-1">Configurez votre système de trading</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-effect rounded-xl p-6 space-y-6"
        >
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Gestion du Capital
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Capital Initial (€)</Label>
              <Input
                type="number"
                value={localCapital}
                onChange={(e) => setLocalCapital(Number(e.target.value))}
                className="glass-effect"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Risque par Trade (%): {riskPerTrade}%</Label>
              <Slider
                value={[riskPerTrade]}
                onValueChange={(value) => setRiskPerTrade(value[0])}
                max={5}
                min={0.1}
                step={0.1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">
                Montant risqué: {(localCapital * riskPerTrade / 100).toFixed(2)}€
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-effect rounded-xl p-6 space-y-6"
        >
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            Clés API
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Binance API Key</Label>
              <Input
                type="password"
                placeholder="Géré via Supabase Secrets"
                className="glass-effect"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Les clés API sont configurées de manière sécurisée via les secrets Supabase.
              </p>
            </div>

            <div className="space-y-2">
              <Label>OANDA API Key</Label>
              <Input
                type="password"
                placeholder="Géré via Supabase Secrets"
                className="glass-effect"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Les clés API sont configurées de manière sécurisée via les secrets Supabase.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-6 space-y-6"
        >
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            Alertes
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Telegram Bot Token</Label>
              <Input
                type="password"
                placeholder="À configurer pour les alertes Telegram"
                className="glass-effect"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>Chat ID</Label>
              <Input
                type="text"
                placeholder="À configurer pour les alertes Telegram"
                className="glass-effect"
                disabled
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-6 space-y-6"
        >
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Sécurité
          </h3>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-200">
              Votre système de trading fonctionne en **mode réel** avec des données de marché en direct.
            </p>
          </div>
        </motion.div>
      </div>

      <Button 
        onClick={handleSave}
        className="w-full gap-2 glow-effect"
        size="lg"
      >
        <Save className="w-5 h-5" />
        Sauvegarder les Paramètres
      </Button>
    </div>
  );
};

export default SettingsPanel;