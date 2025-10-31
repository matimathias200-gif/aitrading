import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Brain, Zap, TrendingUp, Shield, CheckCircle, ArrowRight, Mail, Sparkles, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/customSupabaseClient';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('demo');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptTerms) {
      alert('Veuillez accepter les conditions pour continuer');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          email,
          interest,
          source: 'landing_page',
          subscribed_at: new Date().toISOString()
        });

      if (error) throw error;

      setSubmitted(true);
      setEmail('');
      setAcceptTerms(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section with Video Background */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Crect fill='%23000' width='1920' height='1080'/%3E%3C/svg%3E"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-digital-network-of-points-and-lines-1087-large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-red-900/20 to-black/90"></div>
        </div>

        {/* Parallax Content */}
        <motion.div
          style={{ y, opacity }}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-red-500 text-sm font-semibold">IA Propriétaire de Nouvelle Génération</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-red-500 to-white bg-clip-text text-transparent animate-gradient">
                NEURA TRADE AI
              </span>
            </h1>

            <p className="text-xl md:text-2xl lg:text-3xl text-gray-300 mb-4 max-w-4xl mx-auto">
              L'Intelligence Artificielle qui Anticipe les Marchés Cryptos
            </p>

            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
              Technologie exclusive développée par <span className="text-red-500 font-semibold">NeuraTrade Technologies™</span>
              <br />
              Analyse en temps réel • Signaux autonomes • Apprentissage continu
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                onClick={() => document.getElementById('demo-form').scrollIntoView({ behavior: 'smooth' })}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white text-lg font-bold rounded-full transition-all duration-300 shadow-lg shadow-red-500/50 hover:shadow-red-500/80"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Accéder à l'IA
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <Link
                to="/login"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-lg font-bold rounded-full transition-all duration-300 border border-white/20"
              >
                <Play className="w-5 h-5" />
                Voir la Démo
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-500" />
                <span>98.7% de Précision</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-500" />
                <span>Analyse 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-500" />
                <span>Paiement Crypto</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-red-500/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-red-500 rounded-full"></div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Technologie <span className="text-red-500">Exclusive</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Notre IA propriétaire combine analyse quantitative avancée et apprentissage profond
              pour générer des signaux de trading d'une précision inégalée
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "Analyse Multi-Dimensionnelle",
                description: "Notre système analyse simultanément les prix, volumes, sentiment des news et comportements de marché pour identifier les opportunités avec une précision chirurgicale."
              },
              {
                icon: Zap,
                title: "Signaux Autonomes en Temps Réel",
                description: "Recevez des signaux BUY/SELL générés automatiquement 24/7 avec points d'entrée, take-profit et stop-loss calculés par notre IA pour maximiser vos gains."
              },
              {
                icon: TrendingUp,
                title: "Apprentissage Continu",
                description: "Chaque trade améliore notre modèle. L'IA apprend en permanence des patterns de marché pour affiner ses prédictions et s'adapter aux conditions changeantes."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-8 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-red-500/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                <div className="relative">
                  <feature.icon className="w-12 h-12 text-red-500 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Signals Preview */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Signaux en <span className="text-red-500">Temps Réel</span>
            </h2>
            <p className="text-xl text-gray-400">
              Aperçu de notre système d'analyse en action
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-black border border-gray-800 rounded-2xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-400">ANALYSE EN COURS</span>
              </div>
              <div className="text-sm text-gray-500">Dernière mise à jour : il y a 3 secondes</div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold">BTC/USDT</span>
                  <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">BUY</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Entrée</span>
                    <span className="font-semibold">$109,203</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Take Profit</span>
                    <span className="font-semibold text-green-500">$111,427</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stop Loss</span>
                    <span className="font-semibold text-red-500">$108,090</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-700">
                    <span className="text-gray-400">Confiance IA</span>
                    <span className="font-semibold text-green-500">87%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold">ETH/USDT</span>
                  <span className="px-3 py-1 bg-gray-600 text-white text-sm font-bold rounded-full">WAIT</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prix Actuel</span>
                    <span className="font-semibold">$3,245</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">RSI</span>
                    <span className="font-semibold">52</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volatilité</span>
                    <span className="font-semibold">Faible</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-700">
                    <span className="text-gray-400">Confiance IA</span>
                    <span className="font-semibold text-gray-500">45%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all"
              >
                Accéder à tous les signaux
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Performance Section - Suite dans le prochain message */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Performances <span className="text-red-500">Exceptionnelles</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8 mb-16">
            {[
              { value: "98.7%", label: "Taux de Précision" },
              { value: "24/7", label: "Surveillance Continue" },
              { value: "+127%", label: "ROI Moyen sur 6 mois" },
              { value: "<3s", label: "Temps de Réaction" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-red-500 mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="demo-form" className="py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à Transformer Votre Trading ?
            </h2>
            <p className="text-xl text-gray-400 mb-12">
              Demandez un accès anticipé à NEURA TRADE AI
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500/10 border border-green-500/20 rounded-xl p-8"
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Merci pour votre demande !</h3>
                <p className="text-gray-400 mb-6">
                  Notre équipe va vous contacter sous 24h pour planifier votre démonstration personnalisée.
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all"
                >
                  Créer un compte maintenant
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                <div className="mb-6">
                  <label htmlFor="email" className="block text-left text-sm font-semibold mb-2">
                    Adresse Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-white"
                    placeholder="votre@email.com"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="interest" className="block text-left text-sm font-semibold mb-2">
                    Je suis intéressé par
                  </label>
                  <select
                    id="interest"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-white"
                  >
                    <option value="demo">Une démonstration personnalisée</option>
                    <option value="beta">Accès bêta anticipé</option>
                    <option value="premium">Abonnement Premium</option>
                  </select>
                </div>

                <div className="mb-6 text-left">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-red-500"
                      required
                    />
                    <span className="text-sm text-gray-400">
                      J'accepte de recevoir des communications de NeuraTrade Technologies et j'ai lu
                      la <Link to="/legal#privacy" className="text-red-500 hover:underline">politique de confidentialité</Link>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-8 py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 text-white text-lg font-bold rounded-full transition-all duration-300 shadow-lg shadow-red-500/50 hover:shadow-red-500/80 disabled:shadow-none"
                >
                  {loading ? 'Envoi en cours...' : 'Demander une Démo'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-red-500">NEURA TRADE AI</h3>
              <p className="text-gray-400 text-sm">
                Technologie propriétaire développée par NeuraTrade Technologies™
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/legal#mentions" className="hover:text-red-500 transition-colors">Mentions Légales</Link></li>
                <li><Link to="/legal#privacy" className="hover:text-red-500 transition-colors">Politique de Confidentialité</Link></li>
                <li><Link to="/legal#cgv" className="hover:text-red-500 transition-colors">CGV</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  contact@neuratrade.ai
                </li>
                <li>Support disponible 24/7</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>© 2024 NeuraTrade Technologies™. Tous droits réservés.</p>
            <p className="mt-2">
              Avertissement : Le trading de cryptomonnaies comporte des risques. Les performances passées
              ne garantissent pas les résultats futurs.
            </p>
          </div>
        </div>
      </footer>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
