import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";

const Dashboard = () => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "dashboard") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid password");
      setPassword("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Dashboard Access</CardTitle>
            <CardDescription>Enter password to view analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error && (
                  <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AnalyticsDashboard />;
};

export default Dashboard;