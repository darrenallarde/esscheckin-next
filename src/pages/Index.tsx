import * as React from "react";
import CheckInForm from "@/components/CheckInForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="container mx-auto px-4 py-12">
        {/* Hidden admin access - only accessible via direct URL /auth */}
        <div className="mb-8">
          {/* Admin login button removed for cleaner student experience */}
        </div>

        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            👋 Check In
          </h1>
          <p className="text-xl text-white/90 max-w-md mx-auto">
            Quick and easy - just enter your info!
          </p>
        </div>
        
        <CheckInForm />
      </div>
    </div>
  );
};

export default Index;
