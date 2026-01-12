import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PastoralPriorities, StudentPastoralData } from '@/types/pastoral';
import { AlertCircle, Eye, TrendingUp, Award, Copy, Check, Phone, ChevronDown, ChevronUp } from 'lucide-react';

interface QuickActionsTabProps {
  priorities: PastoralPriorities;
  onStudentClick: (studentId: string) => void;
}

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  count: number;
  students: StudentPastoralData[];
  colorClass: string;
  bgClass: string;
  onStudentClick: (studentId: string) => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  icon,
  count,
  students,
  colorClass,
  bgClass,
  onStudentClick,
}) => {
  const [expanded, setExpanded] = useState(count > 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyMessage = async (student: StudentPastoralData) => {
    const message = student.recommended_message || `Hey ${student.first_name}! Just checking in - we miss seeing you!`;
    await navigator.clipboard.writeText(message);
    setCopiedId(student.student_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className={`${bgClass} border-2`}>
      <CardHeader className="pb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {icon}
            <div className="text-left">
              <CardTitle className={`text-lg ${colorClass}`}>{title}</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xl px-3 py-1 ${colorClass === 'text-red-700' ? 'bg-red-500' : colorClass === 'text-orange-700' ? 'bg-orange-500' : colorClass === 'text-green-700' ? 'bg-green-500' : 'bg-blue-500'}`}>
              {count}
            </Badge>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-2">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">None right now</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {students.map(student => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                >
                  <button
                    onClick={() => onStudentClick(student.student_id)}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold">
                      {student.first_name} {student.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{student.days_since_last_seen === 999999 ? 'Never attended' : `${student.days_since_last_seen} days ago`}</span>
                      {student.phone_number && (
                        <>
                          <span>•</span>
                          <Phone className="w-3 h-3" />
                          <span>{student.phone_number}</span>
                        </>
                      )}
                    </div>
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyMessage(student)}
                    className="ml-2 shrink-0"
                  >
                    {copiedId === student.student_id ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Message
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const QuickActionsTab: React.FC<QuickActionsTabProps> = ({ priorities, onStudentClick }) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Who Needs Your Attention?</h2>
        <p className="text-muted-foreground">Click "Copy Message" to quickly reach out to students</p>
      </div>

      <ActionCard
        title="URGENT - Reach Out Now"
        subtitle="Missing or On the Fringe - These students need immediate contact"
        icon={<AlertCircle className="w-8 h-8 text-red-500" />}
        count={priorities.urgent.length}
        students={priorities.urgent}
        colorClass="text-red-700"
        bgClass="bg-red-50 border-red-200"
        onStudentClick={onStudentClick}
      />

      <ActionCard
        title="MONITOR - Watch Closely"
        subtitle="Attendance declining - Prevent them from slipping away"
        icon={<Eye className="w-8 h-8 text-orange-500" />}
        count={priorities.monitor.length}
        students={priorities.monitor}
        colorClass="text-orange-700"
        bgClass="bg-orange-50 border-orange-200"
        onStudentClick={onStudentClick}
      />

      <ActionCard
        title="CELEBRATE - Affirm Growth"
        subtitle="Consistent attendance - Send encouragement!"
        icon={<TrendingUp className="w-8 h-8 text-green-500" />}
        count={priorities.celebrate.length}
        students={priorities.celebrate}
        colorClass="text-green-700"
        bgClass="bg-green-50 border-green-200"
        onStudentClick={onStudentClick}
      />

      <ActionCard
        title="LEADERSHIP READY"
        subtitle="Ultra-Core students ready for more responsibility"
        icon={<Award className="w-8 h-8 text-blue-500" />}
        count={priorities.leadership.length}
        students={priorities.leadership}
        colorClass="text-blue-700"
        bgClass="bg-blue-50 border-blue-200"
        onStudentClick={onStudentClick}
      />
    </div>
  );
};

export default QuickActionsTab;
