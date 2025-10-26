import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from './ui/button';
import { Zap, Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';

const InitialSignalGenerator = ({ signalsCount }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateInitialSignals = async () => {
    if (!user || isGenerating) return;

    setIsGenerating(true);

    try {
      toast({
        title: "Génération des signaux...",
        description: "L'IA analyse les marchés en temps réel",
      });

      const { data, error } = await supabase.functions.invoke('live-market-data-fetcher');

      if (error) throw error;

      if (data?.signals && data.signals.length > 0) {
        toast({
          title: "Signaux générés !",
          description: `${data.signals.length} nouveaux signaux détectés`,
        });
      } else {
        toast({
          title: "Aucun signal détecté",
          description: "Les conditions de marché ne sont pas favorables pour le moment",
        });
      }
    } catch (error) {
      console.error('Error generating signals:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les signaux",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (signalsCount > 0 || !user) return null;

  return (
    <div className="glass-effect rounded-xl p-6 text-center mb-6">
      <Zap className="w-12 h-12 mx-auto mb-4 text-blue-400" />
      <h3 className="text-xl font-bold mb-2">Aucun signal disponible</h3>
      <p className="text-muted-foreground mb-4">
        Lancez l'analyse IA pour détecter les opportunités de trading
      </p>
      <Button
        onClick={generateInitialSignals}
        disabled={isGenerating}
        className="glow-effect"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyse en cours...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Générer des signaux
          </>
        )}
      </Button>
    </div>
  );
};

export default InitialSignalGenerator;
