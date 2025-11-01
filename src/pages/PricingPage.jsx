import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, Sparkles, ArrowRight, Bitcoin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'Gratuit',
      icon: Sparkles,
      color: 'from-gray-600 to-gray-700',
      features: [
        '3 signaux par jour',
        'Précision 85%',
        'Analyse basique',
        'Support email',
        'Dashboard standard'
      ],
      cta: 'Compte Gratuit',
      popular: false
    },
    {
      name: 'Premium',
      price: '49',
      priceUSD: 49,
      priceBTC: '0.00045',
      priceETH: '0.015',
      period: '/ mois',
      icon: Zap,
      color: 'from-red-500 to-orange-500',
      features: [
        'Signaux illimités 24/7',
        'Précision 98.7%',
        'Analyse avancée IA',
        'Alertes en temps réel',
        'Support prioritaire',
        'Statistiques détaillées',
        'Backtesting historique'
      ],
      cta: 'Passer à Premium',
      popular: true
    },
    {
      name: 'Pro',
      price: '99',
      priceUSD: 99,
      priceBTC: '0.00091',
      priceETH: '0.031',
      period: '/ mois',
      icon: Crown,
      color: 'from-yellow-500 to-orange-600',
      features: [
        'Tout Premium +',
        'API personnalisée',
        'Trading automatique',
        'Portfolio management',
        'Analyse institutionnelle',
        'Support 24/7 dédié',
        'Formations exclusives',
        'Early access nouvelles features'
      ],
      cta: 'Devenir Pro',
      popular: false
    }
  ];

  const handleSubscribe = async (plan) => {
    // PAIEMENTS TEMPORAIREMENT DÉSACTIVÉS
    // En attente de l'intégration de l'API de paiement

    if (!user) {
      navigate('/signup');
      return;
    }

    if (plan.name === 'Free') {
      navigate('/app');
      return;
    }

    // Afficher message temporaire
    alert('🔒 Paiements temporairement désactivés\n\nLes abonnements Premium et Pro seront bientôt disponibles.\nL\'intégration du système de paiement crypto est en cours.');

    return;

    /* CODE PAIEMENT - À RÉACTIVER PLUS TARD
    setSelectedPlan(plan);
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: user.id,
          plan: plan.name.toLowerCase(),
          amount: plan.priceUSD
        })
      });

      const data = await response.json();

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        alert('Erreur lors de la création du paiement');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
    */
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to={user ? '/dashboard' : '/landing'}>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-red-500 to-white bg-clip-text text-transparent">
                NEURA TRADE AI
              </h1>
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Retour au Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Choisissez Votre <span className="text-red-500">Plan</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Accédez à la puissance de notre IA propriétaire pour maximiser vos profits
            en crypto-trading
          </p>

          {/* Crypto Payment Info */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-full">
            <Bitcoin className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-400">
              Paiement accepté en <span className="text-white font-semibold">BTC, ETH, USDT</span>
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-gray-900 border rounded-2xl p-8 ${
                plan.popular
                  ? 'border-red-500 shadow-lg shadow-red-500/20 scale-105'
                  : 'border-gray-800'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full">
                    LE PLUS POPULAIRE
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-r ${plan.color} rounded-xl flex items-center justify-center mb-6`}>
                <plan.icon className="w-8 h-8 text-white" />
              </div>

              {/* Plan Name */}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold">${plan.price}</span>
                <span className="text-gray-400 ml-2">{plan.period}</span>
              </div>

              {/* Crypto Prices */}
              {plan.priceBTC && (
                <div className="mb-6 space-y-1 text-sm text-gray-400">
                  <div>≈ {plan.priceBTC} BTC</div>
                  <div>≈ {plan.priceETH} ETH</div>
                </div>
              )}

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading && selectedPlan === plan}
                className={`w-full px-6 py-3 font-bold rounded-full transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:shadow-red-500/50'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading && selectedPlan === plan ? (
                  'Traitement...'
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ / Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold mb-6 text-center">Paiement Sécurisé en Crypto</h3>

          <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-400">
            <div className="text-center">
              <Bitcoin className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h4 className="font-semibold text-white mb-2">Multi-Devises</h4>
              <p>Payez en BTC, ETH, USDT ou autres cryptomonnaies acceptées</p>
            </div>

            <div className="text-center">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h4 className="font-semibold text-white mb-2">Activation Instantanée</h4>
              <p>Votre abonnement est activé dès confirmation de la transaction</p>
            </div>

            <div className="text-center">
              <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
              <h4 className="font-semibold text-white mb-2">Sans Engagement</h4>
              <p>Résiliez à tout moment, aucun prélèvement automatique</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Tous les paiements sont sécurisés et traités via notre gateway crypto certifié.
              <br />
              Politique de remboursement de 14 jours pour tous les plans.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
