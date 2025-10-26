import React from 'react';
    import { motion } from 'framer-motion';
    import { Link } from 'react-router-dom';
    import { ArrowLeft } from 'lucide-react';
    import MarketHeatmap from '@/components/MarketHeatmap';
    import { Button } from '@/components/ui/button';

    const MarketPage = ({ marketData }) => {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour au Dashboard
            </Link>
          </Button>

          <MarketHeatmap marketData={marketData} />
        </motion.div>
      );
    };

    export default MarketPage;