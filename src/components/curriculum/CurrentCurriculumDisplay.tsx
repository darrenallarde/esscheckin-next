import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurriculumWeek } from '@/types/curriculum';
import { Book, Calendar, Heart, Users, Edit } from 'lucide-react';

interface CurrentCurriculumDisplayProps {
  curriculum: CurriculumWeek | null;
  onEdit?: () => void;
}

const CurrentCurriculumDisplay: React.FC<CurrentCurriculumDisplayProps> = ({ curriculum, onEdit }) => {
  if (!curriculum) {
    return (
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-6 text-center">
          <Book className="w-12 h-12 mx-auto mb-3 text-yellow-600" />
          <h3 className="font-semibold text-lg mb-2">No Current Curriculum Set</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add this week's teaching content to enable AI-powered recommendations
          </p>
          <Button onClick={onEdit}>
            Add Current Teaching
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2 mb-1">
              <Book className="w-5 h-5 text-blue-600" />
              Current Teaching: {curriculum.topic_title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Week of {new Date(curriculum.week_date).toLocaleDateString()}</span>
              <span className="text-gray-400">•</span>
              <span className="font-medium">{curriculum.series_name}</span>
            </div>
          </div>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scripture */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-1">Main Scripture</div>
          <div className="text-base font-medium text-blue-900">{curriculum.main_scripture}</div>
        </div>

        {/* Big Idea */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-1">Big Idea</div>
          <div className="text-base italic text-gray-800">{curriculum.big_idea}</div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {/* Faith Skills */}
          {curriculum.faith_skills.length > 0 && (
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              {curriculum.faith_skills.map(skill => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {/* Target Phases */}
          {curriculum.target_phases.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-green-500" />
              {curriculum.target_phases.sort().map(phase => (
                <Badge key={phase} variant="outline" className="text-xs">
                  {phase}th
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Application Challenge */}
        <div className="bg-white/70 rounded-lg p-3 border border-blue-200">
          <div className="text-xs font-semibold text-gray-600 mb-1">This Week's Challenge</div>
          <div className="text-sm text-gray-800">{curriculum.application_challenge}</div>
        </div>

        {/* AI Context Notice */}
        <div className="text-xs text-center text-gray-600 pt-2 border-t">
          💡 This content powers AI recommendations for each student
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentCurriculumDisplay;
