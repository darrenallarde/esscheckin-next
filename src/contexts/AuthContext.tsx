import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user roles (plural - users can have multiple roles)
          const fetchUserRole = async () => {
            try {
              const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id);

              if (!error && data && data.length > 0) {
                // User can have multiple roles - pick the highest permission level
                // Priority order: super_admin > admin > student_leader > student
                const roles = data.map(r => r.role);

                if (roles.includes('super_admin')) {
                  setUserRole('super_admin');
                } else if (roles.includes('admin')) {
                  setUserRole('admin');
                } else if (roles.includes('student_leader')) {
                  setUserRole('student_leader');
                } else if (roles.includes('student')) {
                  setUserRole('student');
                } else {
                  // Unknown role, default to student
                  setUserRole('student');
                }
              } else if (!data || data.length === 0) {
                // No role found - default to 'student' for users without a role
                setUserRole('student');
              }
            } catch (error) {
              console.error('Error fetching user role:', error);
              // Default to student if there's an error
              setUserRole('student');
            }
          };

          setTimeout(fetchUserRole, 0);
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Error getting session:', error);
        setLoading(false);
      }
    };

    getSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const signInWithOtp = React.useCallback(async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
          data: {}
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const value = React.useMemo(() => ({
    user,
    session,
    userRole,
    loading,
    signInWithOtp,
    signOut,
  }), [user, session, userRole, loading, signInWithOtp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};