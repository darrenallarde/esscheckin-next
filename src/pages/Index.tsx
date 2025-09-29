import * as React from "react";
import CheckInForm from "@/components/CheckInForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="container mx-auto px-4 py-12">
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
