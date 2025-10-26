import React from 'react';
    import { motion } from 'framer-motion';
    import { Link } from 'react-router-dom';
    import { ArrowLeft, BarChart } from 'lucide-react';
    import SignalList from '@/components/SignalList';
    import { Button } from '@/components/ui/button';

    const SignalsPage = ({ signals, isLoading, title }) => {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
            <div className='flex justify-between items-center'>
                <h2 className="text-3xl font-bold gradient-text flex items-center gap-3">
                    <BarChart />
                    {title}
                </h2>
                <Button asChild variant="outline">
                    <Link to="/" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                    </Link>
                </Button>
            </div>
          

          <SignalList signals={signals} isLoading={isLoading} />
        </motion.div>
      );
    };

    export default SignalsPage;