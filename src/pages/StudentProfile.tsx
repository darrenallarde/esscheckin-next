import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Calendar, Phone, Mail } from "lucide-react";

const StudentProfile = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect if not student
  React.useEffect(() => {
    if (user && userRole && userRole !== 'student') {
      navigate('/');
    }
  }, [user, userRole, navigate]);

  // Show loading while determining access
  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect non-students
  if (userRole !== 'student') {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Student</Badge>
              <span className="text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Check-In
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{user.email}</span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Phone:</span>
                    <span>{user.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Member since:</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full" disabled>
                  Edit Profile (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                My Attendance
              </CardTitle>
              <CardDescription>
                Your check-in history and attendance record
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Attendance History</h3>
                <p className="text-muted-foreground text-sm">
                  Your attendance history will appear here once you start checking in
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common actions and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" disabled>
                Update Emergency Contact
              </Button>
              <Button variant="outline" disabled>
                View Event Calendar
              </Button>
              <Button variant="outline" disabled>
                Request Information Change
              </Button>
              <Button variant="outline" disabled>
                Contact Admin
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              These features are coming soon. Contact your administrator if you need assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentProfile;