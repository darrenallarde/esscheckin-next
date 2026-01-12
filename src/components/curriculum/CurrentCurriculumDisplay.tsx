import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurriculumWeek } from '@/types/curriculum';
import { FileText, Calendar, Edit } from 'lucide-react';

interface CurrentCurriculumDisplayProps {
  curriculum: CurriculumWeek | null;
  onEdit?: () => void;
}

const CurrentCurriculumDisplay: React.FC<CurrentCurriculumDisplayProps> = ({ curriculum, onEdit }) => {
  if (!curriculum) {
    return (
      <Card className="bg-muted border-border">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold text-lg mb-2">No Sermon Added</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add this week's sermon to enable AI-powered recommendations
          </p>
          <Button onClick={onEdit}>
            Add Sermon
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get sermon preview (first 300 chars)
  const sermonContent = curriculum.big_idea || '';
  const hasFullSermon = sermonContent.length > 200;
  const sermonPreview = hasFullSermon
    ? sermonContent.substring(0, 300) + '...'
    : sermonContent;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-primary" />
              Current Sermon
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Week of {new Date(curriculum.week_date).toLocaleDateString()}</span>
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

      <CardContent className="space-y-3">
        {/* Topic/Title */}
        {curriculum.topic_title && curriculum.topic_title !== 'Teaching' && (
          <div className="font-medium text-foreground">
            {curriculum.topic_title}
          </div>
        )}

        {/* Sermon Preview */}
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {sermonPreview}
          </div>
          {hasFullSermon && (
            <div className="text-xs text-muted-foreground mt-2">
              {sermonContent.length.toLocaleString()} characters total
            </div>
          )}
        </div>

        {/* AI Context Notice */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          This sermon powers AI recommendations for each student
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentCurriculumDisplay;
