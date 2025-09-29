import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import CheckInForm from "@/components/CheckInForm";

const Index = () => {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Youth Ministry Check-In</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.email}
              {userRole && <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{userRole}</span>}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-foreground mb-2">
            Welcome to Ministry!
          </h2>
          <p className="text-xl text-muted-foreground">
            {userRole === 'admin' 
              ? "Use the form below to check students in, or manage the system from your admin panel."
              : "Let's get you checked in for today's ministry."
            }
          </p>
        </div>
        
        {userRole === 'admin' && (
          <div className="text-center mb-6">
            <Button onClick={() => navigate("/admin")} size="lg">
              Admin Dashboard
            </Button>
          </div>
        )}
        
        <CheckInForm />
      </div>
    </div>
  );
};

export default Index;
