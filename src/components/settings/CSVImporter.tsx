"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { EMPTY_STATES, SUCCESS_MESSAGES, ACTIONS } from "@/lib/copy";
import ColumnMapper from "./ColumnMapper";
import ImportPreview from "./ImportPreview";

interface CSVImporterProps {
  organizationId: string;
  onComplete?: () => void;
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete" | "error";

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface ColumnMapping {
  [key: string]: string | null;
}

// Required and optional fields for student import
const STUDENT_FIELDS = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "phone_number", label: "Phone Number", required: false },
  { key: "email", label: "Email", required: false },
  { key: "grade", label: "Grade", required: false },
  { key: "high_school", label: "High School", required: false },
  { key: "date_of_birth", label: "Date of Birth", required: false },
  { key: "parent_name", label: "Parent Name", required: false },
  { key: "parent_phone", label: "Parent Phone", required: false },
  { key: "mother_first_name", label: "Mother First Name", required: false },
  { key: "mother_last_name", label: "Mother Last Name", required: false },
  { key: "mother_phone", label: "Mother Phone", required: false },
  { key: "father_first_name", label: "Father First Name", required: false },
  { key: "father_last_name", label: "Father Last Name", required: false },
  { key: "father_phone", label: "Father Phone", required: false },
  { key: "address", label: "Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "ZIP Code", required: false },
];

export default function CSVImporter({ organizationId, onComplete }: CSVImporterProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const parseCSV = (text: string): ParsedData => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error("CSV file is empty");
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    const rows = lines.slice(1).map(line => parseCSVLine(line));

    return { headers, rows };
  };

  // Simple CSV line parser that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);

      if (parsed.rows.length === 0) {
        throw new Error("No data rows found in CSV");
      }

      setParsedData(parsed);

      // Auto-detect column mappings
      const autoMapping: ColumnMapping = {};
      parsed.headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Try to match headers to fields
        for (const field of STUDENT_FIELDS) {
          const normalizedField = field.key.replace(/_/g, "");
          const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");

          if (normalizedHeader === normalizedField ||
              normalizedHeader === normalizedLabel ||
              normalizedHeader.includes(normalizedField) ||
              normalizedField.includes(normalizedHeader)) {
            autoMapping[field.key] = header;
            break;
          }
        }
      });

      setColumnMapping(autoMapping);
      setStep("mapping");
    } catch (error) {
      console.error("Error parsing CSV:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse CSV file");
      setStep("error");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
  });

  const handleMappingComplete = (mapping: ColumnMapping) => {
    setColumnMapping(mapping);
    setStep("preview");
  };

  const handleStartImport = async () => {
    if (!parsedData) return;

    setStep("importing");
    setImportProgress(0);

    try {
      const mappedData = parsedData.rows.map(row => {
        const student: Record<string, string> = {};

        Object.entries(columnMapping).forEach(([field, header]) => {
          if (header) {
            const headerIndex = parsedData.headers.indexOf(header);
            if (headerIndex >= 0 && row[headerIndex]) {
              student[field] = row[headerIndex];
            }
          }
        });

        return student;
      }).filter(student => student.first_name && student.last_name);

      // Call the import API
      const response = await fetch("/api/import/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          students: mappedData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      const result = await response.json();
      setImportedCount(result.imported);
      setStep("complete");
    } catch (error) {
      console.error("Import error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Import failed");
      setStep("error");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setImportProgress(0);
    setImportedCount(0);
    setErrorMessage("");
  };

  // Upload step
  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {ACTIONS.import.start}
          </CardTitle>
          <CardDescription>
            {EMPTY_STATES.importEmpty.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the CSV file here...</p>
            ) : (
              <>
                <p className="text-lg mb-2">
                  Drag and drop your CSV file here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to select a file
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mapping step
  if (step === "mapping" && parsedData) {
    return (
      <ColumnMapper
        headers={parsedData.headers}
        fields={STUDENT_FIELDS}
        initialMapping={columnMapping}
        onComplete={handleMappingComplete}
        onBack={handleReset}
      />
    );
  }

  // Preview step
  if (step === "preview" && parsedData) {
    return (
      <ImportPreview
        headers={parsedData.headers}
        rows={parsedData.rows.slice(0, 10)}
        mapping={columnMapping}
        totalRows={parsedData.rows.length}
        onConfirm={handleStartImport}
        onBack={() => setStep("mapping")}
      />
    );
  }

  // Importing step
  if (step === "importing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {ACTIONS.import.inProgress}
          </CardTitle>
          <CardDescription>
            Please wait while we import your students...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={importProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Importing students...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Complete step
  if (step === "complete") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            {ACTIONS.import.complete}
          </CardTitle>
          <CardDescription>
            {SUCCESS_MESSAGES.importComplete(importedCount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={handleReset} variant="outline">
              Import More
            </Button>
            {onComplete && (
              <Button onClick={onComplete}>
                Go to Students
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error step
  if (step === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Import Error
          </CardTitle>
          <CardDescription>
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleReset} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
