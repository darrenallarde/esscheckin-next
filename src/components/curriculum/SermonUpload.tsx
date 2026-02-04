"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SermonUploadProps {
  value: string;
  title: string;
  onChange: (content: string, title?: string) => void;
  onFileTypeChange?: (type: string | null) => void;
}

export function SermonUpload({
  value,
  title,
  onChange,
  onFileTypeChange,
}: SermonUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        await processFile(file);
      }
    },
    [onChange, onFileTypeChange]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "pdf") {
      // For now, show message that PDF isn't supported yet
      alert(
        "PDF support coming soon! For now, please copy and paste your sermon text."
      );
      return;
    }

    if (extension === "txt" || extension === "md") {
      const text = await file.text();
      setFileName(file.name);
      onFileTypeChange?.(extension);

      // Try to extract title from first line
      const firstLine = text.split("\n")[0].trim();
      const extractedTitle =
        firstLine.length > 5 && firstLine.length < 100
          ? firstLine.replace(/^#+ /, "") // Remove markdown headers
          : undefined;

      onChange(text, extractedTitle);
    } else {
      alert("Please upload a .txt, .md, or .pdf file");
    }
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setFileName(null);
    onFileTypeChange?.(null);
    onChange(text);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(value, e.target.value);
  };

  const clearFile = () => {
    setFileName(null);
    onFileTypeChange?.(null);
    onChange("", "");
  };

  return (
    <div className="space-y-4">
      {/* Title Input */}
      <div>
        <Label htmlFor="sermon-title">Sermon Title (optional)</Label>
        <Input
          id="sermon-title"
          placeholder="e.g., Finding Your Identity in Christ"
          value={title}
          onChange={handleTitleChange}
          className="mt-1"
        />
      </div>

      {/* File Drop Zone */}
      <div>
        <Label>Sermon Content</Label>
        <Card
          className={`mt-1 border-2 border-dashed transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            {fileName ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {value.length.toLocaleString()} characters
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop your sermon file here, or{" "}
                  <label className="text-primary cursor-pointer hover:underline">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.pdf"
                      onChange={handleFileSelect}
                    />
                  </label>
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .txt and .md (PDF coming soon)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Text Area for Paste */}
      <div>
        <Label htmlFor="sermon-content">Or paste your sermon below</Label>
        <Textarea
          id="sermon-content"
          placeholder="Paste your sermon notes, outline, or full script here...

Example:
Title: Finding Your Identity in Christ
Scripture: Ephesians 2:1-10

Main Point: You are not defined by your past, your mistakes, or what others say about you. You are defined by what God says about you.

Key verses:
- 'For we are God's handiwork, created in Christ Jesus to do good works' (Eph 2:10)

Application: This week, write down 3 lies you've believed about yourself, then find 3 Bible verses that speak truth over those areas..."
          value={value}
          onChange={handlePaste}
          rows={12}
          className="mt-1 font-mono text-sm"
        />
        {value && (
          <p className="text-xs text-muted-foreground mt-1">
            {value.length.toLocaleString()} characters
          </p>
        )}
      </div>
    </div>
  );
}
