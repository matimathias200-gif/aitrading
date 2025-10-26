import React, { useState } from 'react';
    import { Button } from '@/components/ui/button';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
    import AuthForm from './AuthForm';
    import { Zap, LogIn, LogOut, Bell, BellOff, BarChart2 } from 'lucide-react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from './ui/use-toast';
    import { Link } from 'react-router-dom';

    const Header = ({ settings, setSettings }) => {
      const { user, signOut } = useAuth();
      const [isAuthModalOpen, setAuthModalOpen] = useState(false);
      const { toast } = useToast();

      const toggleNotifications = async () => {
        if (!user) return;
        const newNotificationsEnabled = !settings.notifications_enabled;
        setSettings(prev => ({...prev, notifications_enabled: newNotificationsEnabled}));
        
        const { error } = await supabase
          .from('settings')
          .update({ notifications_enabled: newNotificationsEnabled, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (error) {
          toast({ title: 'Erreur', description: "Impossible de mettre à jour les notifications.", variant: 'destructive' });
        } else {
          toast({ title: 'Notifications mises à jour', description: `Notifications ${newNotificationsEnabled ? 'activées' : 'désactivées'}.`});
        }
      };

      return (
        <header className="glass-effect sticky top-0 z-50 shadow-lg shadow-black/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2">
                  <Zap className="w-6 h-6 text-blue-400" />
                  <span className="text-xl font-bold gradient-text">CryptoSignalAI</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Button asChild variant="ghost" size="sm">
                       <Link to="/analytics">
                        <BarChart2 className="w-4 h-4 mr-2" />
                        Analyse
                       </Link>
                    </Button>
                    <Button onClick={toggleNotifications} variant="ghost" size="icon" className="w-9 h-9">
                      {settings.notifications_enabled ? <Bell className="w-4 h-4 text-blue-300"/> : <BellOff className="w-4 h-4 text-muted-foreground"/>}
                    </Button>
                    <span className="text-sm text-muted-foreground hidden lg:block">{user.email}</span>
                    <Button onClick={signOut} variant="ghost" size="sm">
                      <LogOut className="w-4 h-4 mr-2" />
                      Déconnexion
                    </Button>
                  </>
                ) : (
                  <Dialog open={isAuthModalOpen} onOpenChange={setAuthModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <LogIn className="w-4 h-4 mr-2" />
                        Connexion
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Accès à CryptoSignalAI</DialogTitle>
                      </DialogHeader>
                      <AuthForm closeModal={() => setAuthModalOpen(false)} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
        </header>
      );
    };

    export default Header;