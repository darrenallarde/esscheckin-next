import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import CheckInForm from "@/components/CheckInForm";

const Index = () => {
  const { user, userRole, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-background">
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Youth Ministry Check-In</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.email}
                  {userRole && <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{userRole}</span>}
                </span>
                <Button asChild variant="outline">
                  <Link to="/account">My Account</Link>
                </Button>
                {userRole === 'admin' && (
                  <Button asChild>
                    <Link to="/admin">Admin Panel</Link>
                  </Button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/account">My Account</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-foreground mb-2">
            Welcome to Ministry!
          </h2>
          <p className="text-xl text-muted-foreground">
            Quick check-in - just enter your info and you're all set!
          </p>
        </div>
        
        <CheckInForm />
        
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-4">
            Need to update your information or manage your account?
          </p>
          <Button asChild variant="link">
            <Link to="/auth">Sign in to your account →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
