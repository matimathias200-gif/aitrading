
import React, { useState } from 'react';
    import { motion } from 'framer-motion';
    import { Clock, Zap, Target, Shield, Check, Loader2, MessageSquare, Award, ThumbsDown, Minus } from 'lucide-react';
    import { Button } from './ui/button';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from './ui/use-toast';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog"

    const formatPrice = (price) => {
        if (price === null || price === undefined) return 'N/A';
        const priceNum = Number(price);
        if (priceNum === 0) return '$0.00';
        if (priceNum < 0.01) {
            return `$${priceNum.toFixed(8)}`;
        }
        return `$${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const DetailItem = ({ icon: Icon, label, value, className = '' }) => (
      <div className={`flex justify-between items-center text-sm ${className}`}>
        <span className="text-muted-foreground flex items-center gap-2"><Icon className="w-4 h-4" />{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
    );

    const SignalCard = ({ signal, isHistory = false }) => {
      const [loading, setLoading] = useState(false);
      const { toast } = useToast();
      const { user } = useAuth();
      
      const isBuy = signal.signal_type === 'BUY';
      const isWait = signal.signal_type === 'WAIT';

      const signalColors = isBuy ? 'from-green-500 to-emerald-500' : isWait ? 'from-gray-500 to-slate-500' : 'from-red-500 to-pink-500';
      const confidencePercent = (signal.confidence || 0);

      const handleTradeResult = async (result) => {
        if (!user) {
            toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            // We update the signal status to 'taken' to move it to history
            const { error: signalError } = await supabase
              .from('crypto_signals')
              .update({ status: 'taken', feedback_result: result }) // Add feedback directly
              .eq('id', signal.id);
            if (signalError) throw signalError;

            // We also insert into trade_feedback for the learning mechanism
            const feedbackData = {
                signal_id: signal.id,
                user_id: user.id,
                symbol: signal.symbol,
                result: result,
                is_manual_feedback: true,
            };
            const { error: feedbackError } = await supabase.from('trade_feedback').insert(feedbackData);
            if (feedbackError) {
              // Non-critical, just log it
              console.error('Could not insert into trade_feedback, but signal was updated.', feedbackError);
            }

            toast({
                title: "Feedback enregistré !",
                description: `Le résultat pour ${signal.symbol} a été ajouté à la mémoire de l'IA.`,
            });

        } catch (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
      };

      const getResultDisplay = () => {
          if (signal.status !== 'taken' || !signal.feedback_result) return null;
          
          const resultMapping = {
              win: { text: "Gagnant", icon: Award, color: "text-green-400" },
              lose: { text: "Perdant", icon: ThumbsDown, color: "text-red-400" },
              neutral: { text: "Neutre", icon: Minus, color: "text-gray-400" }
          };
          const resultInfo = resultMapping[signal.feedback_result];
          if (!resultInfo) return null;
          
          const Icon = resultInfo.icon;
          return (
            <span className={`flex items-center gap-1 font-semibold text-xs ${resultInfo.color}`}>
                <Icon className="w-4 h-4" /> {resultInfo.text}
            </span>
          );
      };
      
      return (
        <motion.div
          layout
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass-effect rounded-xl p-5 relative overflow-hidden h-full flex flex-col"
        >
          <motion.div
            key={signal.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className={`absolute inset-0 w-full h-full bg-gradient-to-br ${signalColors} pointer-events-none`}
            style={{ filter: 'blur(50px)' }}
          />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg">{signal.symbol}</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${signalColors} text-white`}>
                {isBuy ? '📈 BUY' : isWait ? '🧘 WAIT' : '📉 SELL'}
              </div>
            </div>
             
            <div className="space-y-2 mb-4">
              <DetailItem icon={Zap} label="Entrée" value={formatPrice(signal.entry_price)} />
              {!isWait && <DetailItem icon={Target} label="Take Profit" value={formatPrice(signal.take_profit)} className="text-green-400" />}
              {!isWait && <DetailItem icon={Shield} label="Stop Loss" value={formatPrice(signal.stop_loss)} className="text-red-400" />}
            </div>
            
            <div className="flex justify-between items-center text-sm py-2 border-y border-white/10">
              <span className="text-muted-foreground flex items-center gap-2"><Zap className="w-4 h-4" />Confiance</span>
              <span className="font-semibold text-sm">{confidencePercent.toFixed(0)}%</span>
            </div>
            
            {signal.reason?.explain && (
                <div className="flex items-start gap-2 text-sm pt-2 mt-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                    <p className="text-muted-foreground italic text-xs">IA: "{signal.reason.explain}"</p>
                </div>
            )}

            <div className="mt-auto pt-4 space-y-3">
              {isHistory && getResultDisplay()}
              
              {!isHistory && signal.status === 'active' && !isWait && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full glow-effect" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4"/>}
                        Enregistrer un résultat
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Quel a été le résultat du trade ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Votre feedback est crucial. Enregistrez le résultat pour ce signal {signal.symbol} pour aider l'IA à apprendre.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="sm:justify-center gap-2">
                        <AlertDialogAction asChild>
                           <Button onClick={() => handleTradeResult('win')} className="bg-green-600 hover:bg-green-700">
                              <Award className="mr-2 h-4 w-4" /> Gagnant
                           </Button>
                        </AlertDialogAction>
                        <AlertDialogAction asChild>
                            <Button onClick={() => handleTradeResult('lose')} className="bg-red-600 hover:bg-red-700">
                              <ThumbsDown className="mr-2 h-4 w-4" /> Perdant
                            </Button>
                        </AlertDialogAction>
                         <AlertDialogAction asChild>
                            <Button onClick={() => handleTradeResult('neutral')} className="bg-gray-600 hover:bg-gray-700">
                              <Minus className="mr-2 h-4 w-4" /> Neutre
                            </Button>
                        </AlertDialogAction>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
                <Clock className="w-3 h-3" />
                <span>{new Date(signal.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </motion.div>
      );
    };

    export default SignalCard;
