"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, AlertCircle } from "lucide-react";
import { ACTIONS } from "@/lib/copy";

interface Field {
  key: string;
  label: string;
  required: boolean;
}

interface ColumnMapperProps {
  headers: string[];
  fields: Field[];
  initialMapping: Record<string, string | null>;
  onComplete: (mapping: Record<string, string | null>) => void;
  onBack: () => void;
}

export default function ColumnMapper({
  headers,
  fields,
  initialMapping,
  onComplete,
  onBack,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string | null>>(initialMapping);

  const requiredFields = fields.filter(f => f.required);
  const optionalFields = fields.filter(f => !f.required);

  const missingRequired = requiredFields.filter(f => !mapping[f.key]);
  const isValid = missingRequired.length === 0;

  const handleFieldChange = (fieldKey: string, header: string | null) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: header === "none" ? null : header,
    }));
  };

  const getUsedHeaders = () => {
    return Object.values(mapping).filter(Boolean) as string[];
  };

  const renderFieldSelect = (field: Field) => {
    const usedHeaders = getUsedHeaders();
    const currentValue = mapping[field.key];

    return (
      <div key={field.key} className="flex items-center gap-4 py-3 border-b last:border-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{field.label}</span>
            {field.required && (
              <Badge variant="secondary" className="text-xs">Required</Badge>
            )}
          </div>
        </div>
        <div className="w-64">
          <Select
            value={currentValue || "none"}
            onValueChange={(value) => handleFieldChange(field.key, value)}
          >
            <SelectTrigger className={currentValue ? "" : "text-muted-foreground"}>
              <SelectValue placeholder="Select column..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Don&apos;t import</span>
              </SelectItem>
              {headers.map((header) => {
                const isUsed = usedHeaders.includes(header) && header !== currentValue;
                return (
                  <SelectItem
                    key={header}
                    value={header}
                    disabled={isUsed}
                    className={isUsed ? "opacity-50" : ""}
                  >
                    {header}
                    {isUsed && " (already mapped)"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {currentValue && (
          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{ACTIONS.import.mapping}</CardTitle>
          <CardDescription>
            Match your CSV columns to student fields. Required fields must be mapped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Required Fields */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              Required Fields
              {missingRequired.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {missingRequired.length} missing
                </Badge>
              )}
            </h3>
            <div className="border rounded-lg px-4">
              {requiredFields.map(renderFieldSelect)}
            </div>
          </div>

          {/* Optional Fields */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Optional Fields
            </h3>
            <div className="border rounded-lg px-4">
              {optionalFields.map(renderFieldSelect)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Warning */}
      {!isValid && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            Please map all required fields: {missingRequired.map(f => f.label).join(", ")}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={() => onComplete(mapping)} disabled={!isValid}>
          {ACTIONS.import.preview}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
