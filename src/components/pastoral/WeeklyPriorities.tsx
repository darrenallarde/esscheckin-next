import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PastoralPriorities } from '@/types/pastoral';
import { AlertCircle, Eye, TrendingUp, Award } from 'lucide-react';

interface WeeklyPrioritiesProps {
  priorities: PastoralPriorities;
  onStudentClick: (studentId: string) => void;
}

const WeeklyPriorities: React.FC<WeeklyPrioritiesProps> = ({ priorities, onStudentClick }) => {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-xl">THIS WEEK'S PRIORITIES</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URGENT */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-700">🚨 URGENT</h3>
            <Badge variant="destructive">{priorities.urgent.length}</Badge>
          </div>
          <div className="space-y-2">
            {priorities.urgent.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No urgent cases</p>
            ) : (
              priorities.urgent.slice(0, 5).map(student => (
                <button
                  key={student.student_id}
                  onClick={() => onStudentClick(student.student_id)}
                  className="w-full text-left p-2 rounded bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
                >
                  <div className="font-medium text-sm">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {student.belonging_status} • {student.days_since_last_seen === 999999 ? 'Never attended' : `${student.days_since_last_seen} days`}
                  </div>
                </button>
              ))
            )}
            {priorities.urgent.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{priorities.urgent.length - 5} more
              </p>
            )}
          </div>
        </div>

        {/* MONITOR */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-orange-700">⚠️ MONITOR</h3>
            <Badge className="bg-orange-500">{priorities.monitor.length}</Badge>
          </div>
          <div className="space-y-2">
            {priorities.monitor.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">All stable</p>
            ) : (
              priorities.monitor.slice(0, 5).map(student => (
                <button
                  key={student.student_id}
                  onClick={() => onStudentClick(student.student_id)}
                  className="w-full text-left p-2 rounded bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-200"
                >
                  <div className="font-medium text-sm">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 rotate-180" />
                    Declining attendance ({student.belonging_status})
                  </div>
                </button>
              ))
            )}
            {priorities.monitor.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{priorities.monitor.length - 5} more
              </p>
            )}
          </div>
        </div>

        {/* CELEBRATE */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-green-700">🌟 CELEBRATE</h3>
            <Badge className="bg-green-500">{priorities.celebrate.length}</Badge>
          </div>
          <div className="space-y-2">
            {priorities.celebrate.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">None this week</p>
            ) : (
              priorities.celebrate.slice(0, 5).map(student => (
                <button
                  key={student.student_id}
                  onClick={() => onStudentClick(student.student_id)}
                  className="w-full text-left p-2 rounded bg-green-50 hover:bg-green-100 transition-colors border border-green-200"
                >
                  <div className="font-medium text-sm">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {student.belonging_status} • {student.total_checkins_8weeks} check-ins
                  </div>
                </button>
              ))
            )}
            {priorities.celebrate.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{priorities.celebrate.length - 5} more
              </p>
            )}
          </div>
        </div>

        {/* LEADERSHIP READY */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-blue-700">💪 LEADERSHIP READY</h3>
            <Badge className="bg-blue-500">{priorities.leadership.length}</Badge>
          </div>
          <div className="space-y-2">
            {priorities.leadership.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Keep developing!</p>
            ) : (
              priorities.leadership.slice(0, 5).map(student => (
                <button
                  key={student.student_id}
                  onClick={() => onStudentClick(student.student_id)}
                  className="w-full text-left p-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <div className="font-medium text-sm">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ultra-Core • {student.wednesday_count}W + {student.sunday_count}S
                  </div>
                </button>
              ))
            )}
            {priorities.leadership.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{priorities.leadership.length - 5} more
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyPriorities;
