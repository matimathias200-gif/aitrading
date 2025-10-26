import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { DollarSign, BarChart2, TrendingUp, Loader2, AlertCircle, LogIn } from 'lucide-react';
import StatsCard from '@/components/StatsCard';

const ReportsPanel = ({ user }) => {
    const [pnlData, setPnlData] = useState({ total_pnl: 0, closed_trades: 0, open_trades: 0 });
    const [dailyPnlData, setDailyPnlData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setLoading(false);
                return;
            };

            setLoading(true);
            setError(null);

            try {
                const pnlPromise = supabase
                    .from('view_paper_pnl')
                    .select('*')
                    .eq('user_id', user.id);

                const dailyPnlPromise = supabase
                    .from('view_daily_pnl')
                    .select('*')
                    .eq('user_id', user.id);

                const [{ data: pnlResult, error: pnlError }, { data: dailyPnl, error: dailyPnlError }] = await Promise.all([pnlPromise, dailyPnlPromise]);

                if (pnlError) throw pnlError;
                if (dailyPnlError) throw dailyPnlError;
                
                const pnl = pnlResult[0] || { total_pnl: 0, closed_trades: 0, open_trades: 0 };
                setPnlData(pnl);
                setDailyPnlData(dailyPnl.map(d => ({ ...d, day: new Date(d.day).toLocaleDateString('fr-FR') })).reverse());

            } catch (err) {
                console.error("Error fetching report data:", err);
                setError("Impossible de charger les données du rapport.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        const subscription = supabase
            .channel('paper_trades_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'paper_trades' }, fetchData)
            .subscribe();
            
        return () => {
            supabase.removeChannel(subscription);
        }

    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-16 h-16 animate-spin text-blue-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-effect rounded-xl p-12 text-center text-red-400">
                <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Erreur</h3>
                <p>{error}</p>
            </div>
        );
    }
    
    if (!user) {
         return (
            <div className="glass-effect rounded-xl p-12 text-center">
                <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
                <p className="text-muted-foreground">Veuillez vous connecter pour voir les rapports.</p>
            </div>
        );
    }
    
    return (
        <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div>
                <h2 className="text-3xl font-bold gradient-text">Rapports de Performance</h2>
                <p className="text-muted-foreground mt-1">Analyse de vos trades simulés (paper trading).</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <StatsCard
                    title="P&L Total"
                    value={`${(pnlData.total_pnl || 0).toFixed(2)}€`}
                    icon={DollarSign}
                    trend={pnlData.total_pnl >= 0 ? 'Bénéfice' : 'Perte'}
                    color={pnlData.total_pnl >= 0 ? 'green' : 'red'}
                />
                 <StatsCard
                    title="Trades Ouverts"
                    value={pnlData.open_trades || 0}
                    icon={TrendingUp}
                    trend="Actuellement en cours"
                    color="blue"
                />
                 <StatsCard
                    title="Trades Clôturés"
                    value={pnlData.closed_trades || 0}
                    icon={BarChart2}
                    trend="Historique complet"
                    color="purple"
                />
            </div>

            <div className="glass-effect rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">P&L Journalier</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyPnlData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="day" stroke="rgba(255, 255, 255, 0.7)" />
                        <YAxis stroke="rgba(255, 255, 255, 0.7)" />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(20, 20, 30, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '0.5rem',
                            }}
                            labelStyle={{ color: '#FFF' }}
                        />
                        <Legend />
                        <Bar dataKey="daily_pnl" name="P&L (€)" fill="url(#colorPnl)" />
                        <defs>
                            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>

        </motion.div>
    );
};

export default ReportsPanel;