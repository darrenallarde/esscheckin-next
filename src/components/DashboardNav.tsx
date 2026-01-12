import React, { useState, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, Heart, Home, Loader2 } from 'lucide-react';

const DashboardNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  const isAnalytics = location.pathname === '/dashboard';
  const isPastoral = location.pathname === '/admin/pastoral';

  const handleNavigate = (path: string) => {
    if (location.pathname === path) return;

    setLoadingRoute(path);
    startTransition(() => {
      navigate(path);
      // Clear loading state after a short delay to ensure smooth transition
      setTimeout(() => setLoadingRoute(null), 100);
    });
  };

  const isLoading = (path: string) => loadingRoute === path || (isPending && loadingRoute === path);

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8">
      <Button
        onClick={() => handleNavigate('/admin')}
        variant="outline"
        size="lg"
        disabled={isLoading('/admin')}
        className="bg-card hover:bg-muted text-foreground font-semibold border-border"
      >
        {isLoading('/admin') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Home className="w-4 h-4 mr-2" />
        )}
        Admin Home
      </Button>

      <Button
        onClick={() => handleNavigate('/dashboard')}
        variant={isAnalytics ? 'default' : 'outline'}
        size="lg"
        disabled={isLoading('/dashboard')}
        className={isAnalytics
          ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg'
          : 'bg-card hover:bg-muted text-foreground font-semibold border-border'}
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
        variant={isPastoral ? 'default' : 'outline'}
        size="lg"
        disabled={isLoading('/admin/pastoral')}
        className={isPastoral
          ? 'bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold shadow-lg'
          : 'bg-card hover:bg-muted text-foreground font-semibold border-border'}
      >
        {isLoading('/admin/pastoral') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Heart className="w-4 h-4 mr-2" />
        )}
        Pastoral Insights
      </Button>
    </div>
  );
};

export default DashboardNav;
