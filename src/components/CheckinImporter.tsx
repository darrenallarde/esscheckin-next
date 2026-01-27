/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { importCheckinsFromCSV, createStudentAndCheckin } from "@/utils/importCheckins";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, UserPlus } from "lucide-react";

const CheckinImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [creatingStudent, setCreatingStudent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setImportResults(null);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      // Read the CSV file
      const csvText = await selectedFile.text();

      // Import check-ins
      const results = await importCheckinsFromCSV(csvText);

      setImportResults(results);

      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.checkinsCreated} check-ins for ${results.studentsFound} students`,
      });

    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "There was an error importing check-ins. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateStudent = async (studentData: any) => {
    setCreatingStudent(studentData.student);

    try {
      const result = await createStudentAndCheckin(studentData.studentData);

      if (result.success) {
        toast({
          title: "Student created!",
          description: `${studentData.student} has been added and checked in.`,
        });

        // Update the results to reflect the new student
        setImportResults((prev: any) => {
          const updated = { ...prev };
          updated.studentsFound++;
          updated.studentsNotFound--;
          updated.checkinsCreated++;

          // Update the specific result
          const resultIndex = updated.results.findIndex((r: any) => r.student === studentData.student);
          if (resultIndex !== -1) {
            updated.results[resultIndex] = {
              ...updated.results[resultIndex],
              success: true,
              action: 'created_student',
              error: undefined
            };
          }

          return updated;
        });
      } else {
        toast({
          title: "Failed to create student",
          description: result.error || 'Unknown error',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating student:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create student',
        variant: "destructive",
      });
    } finally {
      setCreatingStudent(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Historical Check-In Import</CardTitle>
        <CardDescription>
          Import historical check-in data from CSV file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File selector */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {selectedFile ? selectedFile.name : 'Select CSV File'}
          </Button>

          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* Import button */}
        <Button
          onClick={handleImport}
          disabled={isImporting || !selectedFile}
          className="w-full"
        >
          {isImporting ? "Importing Check-ins..." : "Import Check-ins"}
        </Button>

        {/* Results */}
        {importResults && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Import Results:</h3>
            <div className="space-y-1 text-sm">
              <p>Total records in CSV: {importResults.total}</p>
              <p className="text-green-600">Students found: {importResults.studentsFound}</p>
              <p className="text-blue-600">Check-ins created: {importResults.checkinsCreated}</p>
              {importResults.studentsNotFound > 0 && (
                <p className="text-yellow-600">Students not found (skipped): {importResults.studentsNotFound}</p>
              )}
              {importResults.errors > 0 && (
                <p className="text-red-600">Errors: {importResults.errors}</p>
              )}
            </div>

            {/* Show skipped students with option to create */}
            {importResults.results.some((r: any) => r.action === 'student_not_found') && (
              <details className="mt-4" open>
                <summary className="font-medium text-yellow-700 cursor-pointer">
                  Potential New Students ({importResults.studentsNotFound})
                </summary>
                <div className="text-xs space-y-2 mt-2 max-h-96 overflow-y-auto">
                  {importResults.results
                    .filter((r: any) => r.action === 'student_not_found')
                    .map((r: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-yellow-50 p-2 rounded border border-yellow-200">
                        <div className="flex-1">
                          <div className="font-medium text-yellow-900">{r.student}</div>
                          <div className="text-yellow-700">
                            Check-in date: {r.checkinDate}
                            {r.studentData?.phone && ` • Phone: ${r.studentData.phone}`}
                            {r.studentData?.grade && ` • Grade: ${r.studentData.grade}`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateStudent(r)}
                          disabled={creatingStudent === r.student}
                          className="ml-2"
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          {creatingStudent === r.student ? 'Creating...' : 'Create & Check-in'}
                        </Button>
                      </div>
                    ))}
                </div>
              </details>
            )}

            {/* Show errors */}
            {importResults.results.some((r: any) => !r.success && r.action !== 'student_not_found') && (
              <details className="mt-4">
                <summary className="font-medium text-red-600 cursor-pointer">
                  Errors ({importResults.errors})
                </summary>
                <div className="text-xs space-y-1 mt-2 max-h-48 overflow-y-auto">
                  {importResults.results
                    .filter((r: any) => !r.success && r.action !== 'student_not_found')
                    .map((r: any, index: number) => (
                      <div key={index} className="text-red-600">
                        {r.student}: {r.error}
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="font-semibold mb-2">Expected CSV Format:</p>
          <code className="text-xs bg-white px-2 py-1 rounded">
            Proper time,First name,Last name,Phone,Grade
          </code>
          <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
            <li>Date in M/D/YYYY format (e.g., 9/28/2025)</li>
            <li>Students MUST exist in database (based on name + phone)</li>
            <li>Students not found will be skipped (not created)</li>
            <li>Duplicate check-ins (same date) will be skipped</li>
            <li>Check-ins are set to 6:30 PM on the date</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckinImporter;
