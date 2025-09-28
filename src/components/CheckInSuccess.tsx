import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface CheckInSuccessProps {
  student: Student;
  onNewCheckIn: () => void;
}

const CheckInSuccess = ({ student, onNewCheckIn }: CheckInSuccessProps) => {
  const [checkInStats, setCheckInStats] = useState({
    totalCheckIns: 0,
    streakCount: 1,
    lastCheckIn: new Date().toLocaleDateString(),
  });

  useEffect(() => {
    const fetchCheckInStats = async () => {
      try {
        // Get total check-ins for this student
        const { data: checkIns, error } = await supabase
          .from('check_ins')
          .select('checked_in_at')
          .eq('student_id', student.id)
          .order('checked_in_at', { ascending: false });

        if (error) {
          console.error("Error fetching check-in stats:", error);
          return;
        }

        const totalCheckIns = checkIns?.length || 0;
        
        // Calculate streak (simplified - consecutive days would need more complex logic)
        let streakCount = 1;
        
        // For now, we'll show a simple streak based on recent check-ins
        // In a real app, you'd calculate consecutive days/weeks
        if (totalCheckIns > 1) {
          streakCount = Math.min(totalCheckIns, 7); // Cap at 7 for demo
        }

        setCheckInStats({
          totalCheckIns,
          streakCount,
          lastCheckIn: new Date().toLocaleDateString(),
        });
      } catch (error) {
        console.error("Error calculating stats:", error);
      }
    };

    fetchCheckInStats();
  }, [student.id]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl text-green-600">Check-In Successful!</CardTitle>
        <CardDescription>
          Welcome to ministry, {student.first_name} {student.last_name}!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">{checkInStats.totalCheckIns}</div>
            <div className="text-sm text-muted-foreground">Total Check-ins</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">{checkInStats.streakCount}</div>
            <div className="text-sm text-muted-foreground">Check-in Streak</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">Today</div>
            <div className="text-sm text-muted-foreground">Last Check-in</div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            You're all set for today's ministry activities!
          </p>
          <Button onClick={onNewCheckIn} className="w-full md:w-auto">
            Check In Another Student
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckInSuccess;