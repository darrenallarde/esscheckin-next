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
    <div className="flex justify-center gap-3 mb-8">
      <Button
        onClick={() => navigate('/admin')}
        variant="secondary"
        size="lg"
        className="bg-white/90 hover:bg-white text-purple-700 font-semibold"
      >
        <Home className="w-4 h-4 mr-2" />
        Admin Home
      </Button>

      <Button
        onClick={() => navigate('/dashboard')}
        variant={isAnalytics ? 'default' : 'secondary'}
        size="lg"
        className={isAnalytics
          ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg'
          : 'bg-white/80 hover:bg-white text-blue-700 font-semibold'}
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        Analytics
      </Button>

      <Button
        onClick={() => navigate('/admin/pastoral')}
        variant={isPastoral ? 'default' : 'secondary'}
        size="lg"
        className={isPastoral
          ? 'bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg'
          : 'bg-white/80 hover:bg-white text-green-700 font-semibold'}
      >
        <Heart className="w-4 h-4 mr-2" />
        Pastoral Insights
      </Button>
    </div>
  );
};

export default DashboardNav;
