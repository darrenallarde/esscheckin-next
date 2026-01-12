import React, { useState, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Heart, Home, Loader2, LogOut, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DashboardHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  const isAdmin = location.pathname === '/admin';
  const isAnalytics = location.pathname === '/dashboard';
  const isPastoral = location.pathname === '/admin/pastoral';

  const handleNavigate = (path: string) => {
    if (location.pathname === path) return;

    setLoadingRoute(path);
    startTransition(() => {
      navigate(path);
      setTimeout(() => setLoadingRoute(null), 100);
    });
  };

  const isLoading = (path: string) => loadingRoute === path || (isPending && loadingRoute === path);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <header className="bg-card border-b border-border mb-6 -mx-4 px-4 py-3 sticky top-0 z-50">
      <div className="container mx-auto max-w-7xl flex items-center justify-between">
        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Button
            onClick={() => handleNavigate('/admin')}
            variant={isAdmin ? 'default' : 'ghost'}
            size="sm"
            disabled={isLoading('/admin')}
            className={isAdmin ? 'bg-primary text-primary-foreground' : ''}
          >
            {isLoading('/admin') ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Home className="w-4 h-4 mr-2" />
            )}
            Admin
          </Button>

          <Button
            onClick={() => handleNavigate('/dashboard')}
            variant={isAnalytics ? 'default' : 'ghost'}
            size="sm"
            disabled={isLoading('/dashboard')}
            className={isAnalytics ? 'bg-primary text-primary-foreground' : ''}
          >
            {isLoading('/dashboard') ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            Analytics
          </Button>

          <Button
            onClick={() => handleNavigate('/admin/pastoral')}
            variant={isPastoral ? 'default' : 'ghost'}
            size="sm"
            disabled={isLoading('/admin/pastoral')}
            className={isPastoral ? 'bg-secondary text-secondary-foreground' : ''}
          >
            {isLoading('/admin/pastoral') ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Heart className="w-4 h-4 mr-2" />
            )}
            Pastoral
          </Button>
        </nav>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground truncate max-w-[150px]">
              {user.email}
            </span>
            {userRole && (
              <Badge variant="outline" className="text-xs">
                {userRole}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
