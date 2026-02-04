"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCheckinsWithDetails, useRemoveCheckin, type CheckinWithDetails } from "@/hooks/queries/use-attendance-cleanup";
import { useToast } from "@/hooks/use-toast";

interface RemoveCheckinFormProps {
  organizationId: string;
}

export default function RemoveCheckinForm({ organizationId }: RemoveCheckinFormProps) {
  const { toast } = useToast();
  const removeCheckinMutation = useRemoveCheckin();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<CheckinWithDetails | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: checkins, isLoading: isLoadingCheckins } = useCheckinsWithDetails(
    organizationId,
    selectedDate || null
  );

  // Disable dates in the future or more than 90 days ago
  const disabledDays = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    return date > today || date < ninetyDaysAgo;
  };

  const handleRemove = async (checkin: CheckinWithDetails) => {
    setRemovingId(checkin.id);
    setConfirmRemove(null);

    try {
      const result = await removeCheckinMutation.mutateAsync({
        checkinId: checkin.id,
        organizationId,
      });

      toast({
        title: "Check-in removed",
        description: result.points_removed > 0
          ? `Removed check-in and ${result.points_removed} points from ${checkin.first_name} ${checkin.last_name}`
          : `Removed check-in for ${checkin.first_name} ${checkin.last_name}`,
      });
    } catch (error) {
      console.error("Failed to remove check-in:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove check-in",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          Removing a check-in will also remove any points earned from that check-in.
          Streaks and achievements may be affected.
        </AlertDescription>
      </Alert>

      {/* Date Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Select Date</label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[280px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Pick a date to view check-ins"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setCalendarOpen(false);
              }}
              disabled={disabledDays}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Check-ins List */}
      {selectedDate && (
        <div>
          <label className="text-sm font-medium mb-2 block">
            Check-ins on {format(selectedDate, "MMMM d, yyyy")}
          </label>

          {isLoadingCheckins ? (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Loading check-ins...</p>
            </div>
          ) : checkins && checkins.length > 0 ? (
            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between p-3"
                >
                  <div>
                    <span className="font-medium">
                      {checkin.first_name} {checkin.last_name}
                    </span>
                    {checkin.grade && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        Grade {checkin.grade}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-muted-foreground">
                      at {format(new Date(checkin.checked_in_at), "h:mm a")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmRemove(checkin)}
                    disabled={removingId === checkin.id}
                  >
                    {removingId === checkin.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              <p>No check-ins found for this date</p>
            </div>
          )}

          {checkins && checkins.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {checkins.length} check-in{checkins.length === 1 ? "" : "s"} found
            </p>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this check-in?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will remove the check-in for{" "}
                <strong>
                  {confirmRemove?.first_name} {confirmRemove?.last_name}
                </strong>{" "}
                on {selectedDate && format(selectedDate, "MMMM d, yyyy")}.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                Any points earned from this check-in will be deducted, and
                streaks may be affected.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
