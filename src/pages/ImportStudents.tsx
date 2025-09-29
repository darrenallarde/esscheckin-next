import StudentImporter from "@/components/StudentImporter";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const ImportStudents = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (user && userRole && userRole !== 'admin') {
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

  // Redirect non-admins
  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Import Students</h1>
          <p className="text-muted-foreground">Import student data from CSV file</p>
        </div>
        
        <StudentImporter />
        
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/admin')}
            className="text-primary hover:underline"
          >
            ← Back to Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportStudents;