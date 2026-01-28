"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, Users } from "lucide-react";
import { ACTIONS } from "@/lib/copy";

interface ImportPreviewProps {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string | null>;
  totalRows: number;
  onConfirm: () => void;
  onBack: () => void;
}

export default function ImportPreview({
  headers,
  rows,
  mapping,
  totalRows,
  onConfirm,
  onBack,
}: ImportPreviewProps) {
  // Get the mapped fields that have values
  const mappedFields = Object.entries(mapping)
    .filter(([_, header]) => header !== null)
    .map(([field, header]) => ({
      field,
      header: header as string,
      headerIndex: headers.indexOf(header as string),
    }))
    .filter(f => f.headerIndex >= 0);

  // Format field name for display
  const formatFieldName = (field: string): string => {
    return field
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get cell value for a row
  const getCellValue = (row: string[], headerIndex: number): string => {
    return row[headerIndex] || "-";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {ACTIONS.import.preview}
          </CardTitle>
          <CardDescription>
            Review the data before importing. Showing {rows.length} of {totalRows} students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    {mappedFields.map(({ field }) => (
                      <TableHead key={field} className="min-w-[120px]">
                        {formatFieldName(field)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="text-center text-muted-foreground">
                        {rowIndex + 1}
                      </TableCell>
                      {mappedFields.map(({ field, headerIndex }) => (
                        <TableCell key={field}>
                          {getCellValue(row, headerIndex)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalRows > rows.length && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              ...and {totalRows - rows.length} more students
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Ready to import</p>
              <p className="text-sm text-muted-foreground">
                {totalRows} students will be added to your organization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={onConfirm}>
                <Upload className="h-4 w-4 mr-2" />
                {ACTIONS.import.confirm}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
