import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, Heart, LayoutDashboard, Home } from 'lucide-react';

const DashboardNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isAnalytics = location.pathname === '/dashboard';
  const isPastoral = location.pathname === '/admin/pastoral';

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8">
      <Button
        onClick={() => navigate('/admin')}
        variant="outline"
        size="lg"
        className="bg-card hover:bg-muted text-foreground font-semibold border-border"
      >
        <Home className="w-4 h-4 mr-2" />
        Admin Home
      </Button>

      <Button
        onClick={() => navigate('/dashboard')}
        variant={isAnalytics ? 'default' : 'outline'}
        size="lg"
        className={isAnalytics
          ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg'
          : 'bg-card hover:bg-muted text-foreground font-semibold border-border'}
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        Analytics
      </Button>

      <Button
        onClick={() => navigate('/admin/pastoral')}
        variant={isPastoral ? 'default' : 'outline'}
        size="lg"
        className={isPastoral
          ? 'bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold shadow-lg'
          : 'bg-card hover:bg-muted text-foreground font-semibold border-border'}
      >
        <Heart className="w-4 h-4 mr-2" />
        Pastoral Insights
      </Button>
    </div>
  );
};

export default DashboardNav;
