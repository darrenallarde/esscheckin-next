/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { importStudentsFromCSV } from "@/utils/importStudents";
import { useToast } from "@/hooks/use-toast";

interface StudentImporterProps {
  organizationId: string;
}

const StudentImporter = ({ organizationId }: StudentImporterProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    setImportResults(null);
    
    try {
      // Fetch the CSV data from public directory
      const response = await fetch('/students_import.csv');
      const csvText = await response.text();
      
      // Import students
      const results = await importStudentsFromCSV(csvText, organizationId);
      
      setImportResults(results);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.successful} out of ${results.total} unique students`,
      });
      
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: "There was an error importing students. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Student Data Import</CardTitle>
        <CardDescription>
          Import unique students from the CSV file into the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleImport} 
          disabled={isImporting}
          className="w-full"
        >
          {isImporting ? "Importing Students..." : "Import Students from CSV"}
        </Button>
        
        {importResults && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Import Results:</h3>
            <div className="space-y-1 text-sm">
              <p>Total unique students: {importResults.total}</p>
              <p className="text-green-600">Successfully imported: {importResults.successful}</p>
              {importResults.failed > 0 && (
                <p className="text-red-600">Failed imports: {importResults.failed}</p>
              )}
            </div>
            
            {importResults.results.some((r: any) => !r.success) && (
              <div className="mt-4">
                <h4 className="font-medium text-red-600">Failed Imports:</h4>
                <div className="text-xs space-y-1 mt-2">
                  {importResults.results
                    .filter((r: any) => !r.success)
                    .map((r: any, index: number) => (
                      <div key={index} className="text-red-600">
                        {r.student}: {r.error}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p>This will:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Parse the CSV file for student data</li>
            <li>Remove duplicates based on name and phone combinations</li>
            <li>Normalize phone numbers (remove formatting)</li>
            <li>Insert unique students into the database</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentImporter;