import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { supabase } from '@/lib/customSupabaseClient';
    import { BarChart, CheckCircle, XCircle, Percent, ArrowLeft, Loader2, AlertCircle, LogIn } from 'lucide-react';
    import StatsCard from '@/components/StatsCard';
    import { Button } from '@/components/ui/button';
    import { Link } from 'react-router-dom';
    import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

    const TradeAnalysisPage = ({ user }) => {
        const [stats, setStats] = useState({ win: 0, lose: 0, winrate: 0 });
        const [history, setHistory] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

        const fetchData = useCallback(async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            
            try {
                const { data, error: fetchError } = await supabase
                    .from('trade_feedback')
                    .select('created_at, result')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (fetchError) throw fetchError;

                let winCount = 0;
                let loseCount = 0;
                const chartData = data.map((trade, index) => {
                    if (trade.result === 'win') winCount++;
                    if (trade.result === 'lose') loseCount++;
                    const total = winCount + loseCount;
                    return {
                        date: new Date(trade.created_at).toLocaleDateString('fr-FR'),
                        Gains: winCount,
                        Pertes: loseCount,
                        Winrate: total > 0 ? ((winCount / total) * 100).toFixed(1) : 0,
                    };
                });
                
                const totalTrades = winCount + loseCount;
                const winrate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
                
                setStats({ win: winCount, lose: loseCount, winrate: winrate });
                setHistory(chartData);

            } catch (err) {
                console.error('Error fetching trade analysis:', err);
                setError('Impossible de charger les données d\'analyse.');
            } finally {
                setLoading(false);
            }
        }, [user]);
        
        useEffect(() => {
            fetchData();
        }, [fetchData]);

        if (loading) {
            return (
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="w-16 h-16 animate-spin text-blue-400" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="glass-effect rounded-xl p-12 text-center text-red-400">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Erreur de chargement</h3>
                    <p>{error}</p>
                </div>
            );
        }

        if (!user) {
            return (
                <div className="glass-effect rounded-xl p-12 text-center">
                    <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
                    <p className="text-muted-foreground">Veuillez vous connecter pour voir l'analyse des trades.</p>
                </div>
            );
        }

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
            >
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                        <BarChart />
                        Analyse des Performances
                    </h1>
                    <Button asChild variant="outline">
                        <Link to="/" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Retour au Dashboard
                        </Link>
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard title="Trades Gagnants" value={stats.win} icon={CheckCircle} color="green" trend="Total des succès" />
                    <StatsCard title="Trades Perdants" value={stats.lose} icon={XCircle} color="red" trend="Total des échecs" />
                    <StatsCard title="Taux de Réussite" value={`${stats.winrate.toFixed(1)}%`} icon={Percent} color="blue" trend="Winrate global" />
                </div>

                <div className="glass-effect rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-6">Historique des Performances</h3>
                    {history.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
                                <YAxis yAxisId="left" stroke="#82ca9d" />
                                <YAxis yAxisId="right" orientation="right" stroke="#8884d8" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(20, 20, 30, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '0.5rem',
                                    }}
                                    labelStyle={{ color: '#FFF' }}
                                />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="Gains" stroke="#22c55e" strokeWidth={2} />
                                <Line yAxisId="left" type="monotone" dataKey="Pertes" stroke="#ef4444" strokeWidth={2} />
                                <Line yAxisId="right" type="monotone" dataKey="Winrate" stroke="#8884d8" strokeDasharray="5 5" name="Winrate (%)" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <BarChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Aucun historique de trade trouvé.</p>
                                <p className="text-sm">Marquez des trades pour commencer l'analyse.</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    export default TradeAnalysisPage;