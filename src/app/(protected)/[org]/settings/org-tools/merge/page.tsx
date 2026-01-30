"use client";

import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useDuplicates, useMergeStudents, type DuplicatePair } from "@/hooks/queries/use-duplicates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GitMerge, ArrowLeft, Loader2, RefreshCw, Users, Check, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { orgPath } from "@/lib/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function MergeDuplicatesPage() {
  const { currentOrganization, userRole, isLoading: orgLoading } = useOrganization();
  const orgSlug = currentOrganization?.slug;
  const orgId = currentOrganization?.id;
  const { toast } = useToast();

  const canManageOrg = userRole === "owner" || userRole === "admin";

  const { data: duplicates, isLoading, refetch, isRefetching } = useDuplicates(orgId || null);
  const mergeMutation = useMergeStudents();

  // Selection state
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());

  // Preview dialog state
  const [previewPair, setPreviewPair] = useState<DuplicatePair | null>(null);

  // Confirm merge dialog state
  const [confirmMerge, setConfirmMerge] = useState<{
    pair: DuplicatePair;
    keepId: string;
  } | null>(null);

  // Bulk merge state
  const [bulkMerging, setBulkMerging] = useState(false);

  const getPairKey = (pair: DuplicatePair) => `${pair.student_a_id}-${pair.student_b_id}`;

  const toggleSelection = (pair: DuplicatePair) => {
    const key = getPairKey(pair);
    setSelectedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleMerge = async (keepId: string, mergeId: string, pair: DuplicatePair) => {
    // Determine phone handling
    const keepStudent = keepId === pair.student_a_id
      ? { phone: pair.student_a_phone }
      : { phone: pair.student_b_phone };
    const mergeStudent = keepId === pair.student_a_id
      ? { phone: pair.student_b_phone }
      : { phone: pair.student_a_phone };

    try {
      const result = await mergeMutation.mutateAsync({
        keepStudentId: keepId,
        mergeStudentId: mergeId,
        primaryPhone: keepStudent.phone,
        secondaryPhone: mergeStudent.phone,
        organizationId: orgId!,
      });

      toast({
        title: "Students merged",
        description: `Combined ${result.merged_checkins} check-ins and ${result.merged_groups} group memberships`,
      });

      // Remove from selection
      setSelectedPairs((prev) => {
        const next = new Set(prev);
        next.delete(getPairKey(pair));
        return next;
      });

      setConfirmMerge(null);
      setPreviewPair(null);
    } catch (error) {
      toast({
        title: "Merge failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBulkMerge = async () => {
    if (!duplicates || selectedPairs.size === 0) return;

    setBulkMerging(true);
    let successCount = 0;
    let failCount = 0;

    for (const pair of duplicates) {
      const key = getPairKey(pair);
      if (!selectedPairs.has(key)) continue;

      // Auto-select: keep the one with more check-ins
      const keepId = pair.student_a_checkin_count >= pair.student_b_checkin_count
        ? pair.student_a_id
        : pair.student_b_id;
      const mergeId = keepId === pair.student_a_id ? pair.student_b_id : pair.student_a_id;

      try {
        await mergeMutation.mutateAsync({
          keepStudentId: keepId,
          mergeStudentId: mergeId,
          primaryPhone: pair.student_a_checkin_count >= pair.student_b_checkin_count
            ? pair.student_a_phone
            : pair.student_b_phone,
          secondaryPhone: pair.student_a_checkin_count >= pair.student_b_checkin_count
            ? pair.student_b_phone
            : pair.student_a_phone,
          organizationId: orgId!,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkMerging(false);
    setSelectedPairs(new Set());

    toast({
      title: "Bulk merge complete",
      description: `${successCount} merged successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
    });

    refetch();
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 100) return "bg-red-100 text-red-800 border-red-300";
    if (score >= 70) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 100) return "HIGH";
    if (score >= 70) return "MEDIUM";
    return "LOW";
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canManageOrg) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Link href={orgPath(orgSlug, "/settings/org-tools")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Merge Duplicates</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={orgPath(orgSlug, "/settings/org-tools")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Merge Duplicates</h1>
          <p className="text-muted-foreground mt-1">
            Find and merge duplicate student records
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Potential Duplicates
          </CardTitle>
          <CardDescription>
            Students that may be duplicates based on matching phone, email, or similar names
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : duplicates && duplicates.length > 0 ? (
            <>
              {/* Action Bar */}
              {selectedPairs.size > 0 && (
                <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedPairs.size} pair{selectedPairs.size === 1 ? "" : "s"} selected
                  </span>
                  <Button
                    onClick={handleBulkMerge}
                    disabled={bulkMerging}
                    size="sm"
                  >
                    {bulkMerging ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <GitMerge className="h-4 w-4 mr-2" />
                    )}
                    Merge Selected
                  </Button>
                </div>
              )}

              {/* Duplicates List */}
              <div className="space-y-3">
                {duplicates.map((pair) => {
                  const key = getPairKey(pair);
                  const isSelected = selectedPairs.has(key);

                  return (
                    <div
                      key={key}
                      className={cn(
                        "border rounded-lg p-4 transition-colors",
                        isSelected && "border-primary bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(pair)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getConfidenceColor(pair.confidence_score)}>
                              {getConfidenceLabel(pair.confidence_score)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {pair.match_reasons.join(", ")}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Student A */}
                            <div className="p-3 bg-muted/50 rounded">
                              <div className="font-medium">{pair.student_a_name}</div>
                              {pair.student_a_grade && (
                                <div className="text-sm text-muted-foreground">Grade {pair.student_a_grade}</div>
                              )}
                              {pair.student_a_phone && (
                                <div className="text-sm text-muted-foreground">{pair.student_a_phone}</div>
                              )}
                              <div className="text-sm font-medium mt-1">
                                {pair.student_a_checkin_count} check-in{pair.student_a_checkin_count === 1 ? "" : "s"}
                              </div>
                            </div>

                            {/* Student B */}
                            <div className="p-3 bg-muted/50 rounded">
                              <div className="font-medium">{pair.student_b_name}</div>
                              {pair.student_b_grade && (
                                <div className="text-sm text-muted-foreground">Grade {pair.student_b_grade}</div>
                              )}
                              {pair.student_b_phone && (
                                <div className="text-sm text-muted-foreground">{pair.student_b_phone}</div>
                              )}
                              <div className="text-sm font-medium mt-1">
                                {pair.student_b_checkin_count} check-in{pair.student_b_checkin_count === 1 ? "" : "s"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewPair(pair)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No duplicates found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                All student records appear to be unique
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewPair} onOpenChange={() => setPreviewPair(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Duplicate</DialogTitle>
            <DialogDescription>
              Choose which student record to keep. All data will be merged.
            </DialogDescription>
          </DialogHeader>

          {previewPair && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getConfidenceColor(previewPair.confidence_score)}>
                  {getConfidenceLabel(previewPair.confidence_score)} confidence
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {previewPair.match_reasons.join(", ")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Student A */}
                <div
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setConfirmMerge({ pair: previewPair, keepId: previewPair.student_a_id })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Keep this record</span>
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-lg">{previewPair.student_a_name}</div>
                    {previewPair.student_a_grade && <div className="text-sm">Grade {previewPair.student_a_grade}</div>}
                    {previewPair.student_a_phone && <div className="text-sm">{previewPair.student_a_phone}</div>}
                    {previewPair.student_a_email && <div className="text-sm">{previewPair.student_a_email}</div>}
                    <div className="text-sm font-medium text-primary mt-2">
                      {previewPair.student_a_checkin_count} check-in{previewPair.student_a_checkin_count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                {/* Student B */}
                <div
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setConfirmMerge({ pair: previewPair, keepId: previewPair.student_b_id })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Keep this record</span>
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-lg">{previewPair.student_b_name}</div>
                    {previewPair.student_b_grade && <div className="text-sm">Grade {previewPair.student_b_grade}</div>}
                    {previewPair.student_b_phone && <div className="text-sm">{previewPair.student_b_phone}</div>}
                    {previewPair.student_b_email && <div className="text-sm">{previewPair.student_b_email}</div>}
                    <div className="text-sm font-medium text-primary mt-2">
                      {previewPair.student_b_checkin_count} check-in{previewPair.student_b_checkin_count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg text-sm">
                <strong>After merge:</strong> All check-ins, groups, achievements, and notes will be combined into the kept record. Points will be recalculated.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPair(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Merge Dialog */}
      <AlertDialog open={!!confirmMerge} onOpenChange={() => setConfirmMerge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Merge
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMerge && (
                <>
                  You are about to merge these students. The record for{" "}
                  <strong>
                    {confirmMerge.keepId === confirmMerge.pair.student_a_id
                      ? confirmMerge.pair.student_a_name
                      : confirmMerge.pair.student_b_name}
                  </strong>{" "}
                  will be kept, and{" "}
                  <strong>
                    {confirmMerge.keepId === confirmMerge.pair.student_a_id
                      ? confirmMerge.pair.student_b_name
                      : confirmMerge.pair.student_a_name}
                  </strong>{" "}
                  will be deleted after merging their data.
                  <br /><br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmMerge) {
                  const mergeId = confirmMerge.keepId === confirmMerge.pair.student_a_id
                    ? confirmMerge.pair.student_b_id
                    : confirmMerge.pair.student_a_id;
                  handleMerge(confirmMerge.keepId, mergeId, confirmMerge.pair);
                }
              }}
              disabled={mergeMutation.isPending}
            >
              {mergeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GitMerge className="h-4 w-4 mr-2" />
              )}
              Merge Students
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
