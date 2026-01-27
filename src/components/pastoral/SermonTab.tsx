import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurriculumWeek } from '@/types/curriculum';
import { StudentPastoralData } from '@/types/pastoral';
import CurrentCurriculumDisplay from '@/components/curriculum/CurrentCurriculumDisplay';
import GenerateRecommendationsButton from '@/components/pastoral/GenerateRecommendationsButton';
import { BookOpen, Plus, Sparkles } from 'lucide-react';

interface SermonTabProps {
  curriculum: CurriculumWeek | null;
  students: StudentPastoralData[];
  onEditCurriculum: () => void;
  onRecommendationsComplete: () => void;
  organizationId: string;
}

const SermonTab: React.FC<SermonTabProps> = ({
  curriculum,
  students,
  onEditCurriculum,
  onRecommendationsComplete,
  organizationId,
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">This Week's Teaching</h2>
        <p className="text-muted-foreground">Set up your sermon so AI can generate personalized recommendations</p>
      </div>

      {!curriculum ? (
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Sermon Set</h3>
            <p className="text-muted-foreground mb-6">
              Add your sermon content to generate AI-powered pastoral recommendations for each student.
            </p>
            <Button
              onClick={onEditCurriculum}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add This Week's Sermon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <CurrentCurriculumDisplay
            curriculum={curriculum}
            onEdit={onEditCurriculum}
          />

          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Sparkles className="w-5 h-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Generate personalized pastoral recommendations for each student based on this week's sermon
                and their attendance patterns.
              </p>
              <GenerateRecommendationsButton
                students={students}
                curriculum={curriculum}
                onComplete={onRecommendationsComplete}
                organizationId={organizationId}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SermonTab;
