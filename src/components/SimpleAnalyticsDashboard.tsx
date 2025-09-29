import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Legend, 
  LineChart, 
  BarChart 
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import UserHeader from "@/components/UserHeader";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  BarChart3, 
  UserPlus, 
  Clock 
} from "lucide-react";

interface CheckInData {
  date: string;
  dayLabel: string;
  meetingDay: string;
  totalAttendees: number;
  uniqueAttendees: number;
  newStudents: number;
  studentNames: string[];
}

interface StudentStats {
  name: string;
  grade: string;
  totalAttendance: number;
  weeksAttended: number;
  lastAttended: string;
  category: string;
}

const SimpleAnalyticsDashboard = () => {
  const [viewMode, setViewMode] = useState('unique-attendees');

  // Fetch analytics data without auth restrictions
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['simple-analytics-data'],
    queryFn: async () => {
      console.log('Fetching analytics data...');
      
      // Get all check-ins with student information
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          student_id,
          students (
            id,
            first_name,
            last_name,
            grade,
            created_at
          )
        `)
        .order('checked_in_at', { ascending: true });

      if (error) {
        console.error('Error fetching check-ins:', error);
        throw error;
      }

      console.log('Check-ins fetched:', checkIns?.length || 0);

      // Process data into daily aggregations
      const dailyMap = new Map<string, {
        date: string;
        dayLabel: string;
        meetingDay: string;
        totalCheckIns: number;
        uniqueStudents: Set<string>;
        newStudents: Set<string>;
        studentNames: string[];
      }>();

      checkIns?.forEach(checkIn => {
        const date = new Date(checkIn.checked_in_at);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date: dateKey,
            dayLabel: `${shortDate} (${dayName.slice(0, 3)})`,
            meetingDay: dayName,
            totalCheckIns: 0,
            uniqueStudents: new Set(),
            newStudents: new Set(),
            studentNames: []
          });
        }

        const dayData = dailyMap.get(dateKey)!;
        dayData.totalCheckIns++;
        dayData.uniqueStudents.add(checkIn.student_id);
        
        if (checkIn.students) {
          const fullName = `${checkIn.students.first_name} ${checkIn.students.last_name || ''}`.trim();
          if (!dayData.studentNames.includes(fullName)) {
            dayData.studentNames.push(fullName);
          }
        }
      });

      // Convert to array and calculate unique attendees
      const dailyData: CheckInData[] = Array.from(dailyMap.values()).map(day => ({
        date: day.date,
        dayLabel: day.dayLabel,
        meetingDay: day.meetingDay,
        totalAttendees: day.totalCheckIns,
        uniqueAttendees: day.uniqueStudents.size,
        newStudents: 0, // Will be calculated separately
        studentNames: day.studentNames
      }));

      // Get student statistics
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          grade,
          created_at
        `);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      console.log('Students fetched:', students?.length || 0);

      // Calculate student stats
      const studentStats: StudentStats[] = students?.map(student => {
        const studentCheckIns = checkIns?.filter(ci => ci.student_id === student.id) || [];
        const uniqueDates = new Set(studentCheckIns.map(ci => 
          new Date(ci.checked_in_at).toISOString().split('T')[0]
        ));

        return {
          name: `${student.first_name} ${student.last_name || ''}`.trim(),
          grade: student.grade || 'Unknown',
          totalAttendance: studentCheckIns.length,
          weeksAttended: uniqueDates.size,
          lastAttended: studentCheckIns.length > 0 ? 
            new Date(Math.max(...studentCheckIns.map(ci => new Date(ci.checked_in_at).getTime())))
              .toLocaleDateString() : 'Never',
          category: student.grade ? 
            (parseInt(student.grade) >= 9 ? 'High School' : 'Middle School') : 
            'Other'
        };
      }).sort((a, b) => b.totalAttendance - a.totalAttendance) || [];

      const result = {
        dailyData,
        studentStats,
        totalStudents: students?.length || 0,
        totalCheckIns: checkIns?.length || 0,
        peakAttendance: Math.max(...dailyData.map(d => d.uniqueAttendees), 0)
      };

      console.log('Analytics data processed:', result);
      return result;
    },
  });

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-white">Error Loading Analytics</h2>
          <p className="text-white/80 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-white">No Data Available</h2>
          <p className="text-white/80 mb-4">No check-in data found.</p>
        </div>
      </div>
    );
  }

  const currentData = analyticsData.dailyData;

  const chartConfigs = {
    'unique-attendees': {
      title: `Unique Students by Day`,
      subtitle: 'Individual students (no double counting) per day',
      component: (
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dayLabel"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'Unique Students', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value, name) => [value, name === 'uniqueAttendees' ? 'Unique Students' : 'Total Check-ins']} />
              <Legend />
              <Bar dataKey="uniqueAttendees" fill="#10B981" name="Unique Students" />
              <Line type="monotone" dataKey="totalAttendees" stroke="#EF4444" strokeWidth={3} name="Total Check-ins" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )
    },
    'total-attendees': {
      title: `Total Check-ins by Day`,
      subtitle: 'All submissions including multiple from same students',
      component: (
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dayLabel"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'Total Check-ins', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => [value, 'Total Check-ins']} />
              <Bar dataKey="totalAttendees" fill="#3B82F6" name="Total Check-ins" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    },
    'student-table': {
      title: 'Student Attendance Analytics',
      subtitle: 'Individual Student Performance and Engagement Patterns',
      component: (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="border border-border p-3 text-left">Rank</th>
                  <th className="border border-border p-3 text-left">Student Name</th>
                  <th className="border border-border p-3 text-left">Grade</th>
                  <th className="border border-border p-3 text-center">Total Times</th>
                  <th className="border border-border p-3 text-center">Days Attended</th>
                  <th className="border border-border p-3 text-center">Last Attended</th>
                  <th className="border border-border p-3 text-left">Category</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.studentStats.slice(0, 20).map((student, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                    <td className="border border-border p-3 font-bold text-muted-foreground">#{index + 1}</td>
                    <td className="border border-border p-3 font-medium">{student.name}</td>
                    <td className="border border-border p-3">
                      {student.grade === 'Unknown' ? 'Unknown' : `Grade ${student.grade}`}
                    </td>
                    <td className="border border-border p-3 text-center">
                      <Badge variant={student.totalAttendance >= 4 ? 'default' : 'secondary'}>
                        {student.totalAttendance}
                      </Badge>
                    </td>
                    <td className="border border-border p-3 text-center">{student.weeksAttended}</td>
                    <td className="border border-border p-3 text-center text-sm">{student.lastAttended}</td>
                    <td className="border border-border p-3">
                      <Badge variant={
                        student.category === 'High School' ? 'destructive' :
                        student.category === 'Middle School' ? 'default' : 'secondary'
                      }>
                        {student.category}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="container mx-auto px-4 py-8">
        {/* User Header */}
        <UserHeader />
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Echo Student Ministry Analytics
          </h1>
          <p className="text-xl text-white/90 mb-4">
            Live Data: {analyticsData.totalStudents} Students, {analyticsData.totalCheckIns} Total Check-ins
          </p>
        </div>

        {/* View Mode Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(chartConfigs).map(([key, config]) => (
                <Button
                  key={key}
                  variant={viewMode === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(key)}
                >
                  {config.title.split(' by ')[0]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {chartConfigs[viewMode].title}
            </CardTitle>
            <CardDescription>{chartConfigs[viewMode].subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            {chartConfigs[viewMode].component}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{analyticsData.totalStudents}</div>
              <div className="text-muted-foreground">Total Students</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{analyticsData.peakAttendance}</div>
              <div className="text-muted-foreground">Peak Daily Attendance</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{analyticsData.totalCheckIns}</div>
              <div className="text-muted-foreground">Total Check-ins</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-4">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {analyticsData.totalStudents > 0 ? 
                  (analyticsData.totalCheckIns / analyticsData.totalStudents).toFixed(1) : 
                  '0'
                }
              </div>
              <div className="text-muted-foreground">Avg Visits Per Student</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimpleAnalyticsDashboard;