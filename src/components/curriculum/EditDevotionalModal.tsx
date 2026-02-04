"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Devotional } from "@/hooks/queries/use-devotionals";

const editDevotionalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scripture_reference: z.string().optional(),
  scripture_text: z.string().optional(),
  reflection: z.string().min(1, "Reflection is required"),
  prayer_prompt: z.string().optional(),
  discussion_question: z.string().optional(),
});

type EditDevotionalFormData = z.infer<typeof editDevotionalSchema>;

interface EditDevotionalModalProps {
  devotional: Devotional | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Devotional>) => Promise<void>;
  isSaving?: boolean;
}

export function EditDevotionalModal({
  devotional,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: EditDevotionalModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditDevotionalFormData>({
    resolver: zodResolver(editDevotionalSchema),
    defaultValues: {
      title: "",
      scripture_reference: "",
      scripture_text: "",
      reflection: "",
      prayer_prompt: "",
      discussion_question: "",
    },
  });

  // Reset form when devotional changes
  useEffect(() => {
    if (devotional) {
      reset({
        title: devotional.title,
        scripture_reference: devotional.scripture_reference || "",
        scripture_text: devotional.scripture_text || "",
        reflection: devotional.reflection,
        prayer_prompt: devotional.prayer_prompt || "",
        discussion_question: devotional.discussion_question || "",
      });
    }
  }, [devotional, reset]);

  const onSubmit = async (data: EditDevotionalFormData) => {
    await onSave({
      title: data.title,
      scripture_reference: data.scripture_reference || null,
      scripture_text: data.scripture_text || null,
      reflection: data.reflection,
      prayer_prompt: data.prayer_prompt || null,
      discussion_question: data.discussion_question || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Devotional</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Devotional title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scripture_reference">Scripture Reference</Label>
              <Input
                id="scripture_reference"
                {...register("scripture_reference")}
                placeholder="e.g., John 3:16"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="scripture_text">Scripture Text</Label>
              <Textarea
                id="scripture_text"
                {...register("scripture_text")}
                placeholder="The scripture passage text..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reflection">Reflection</Label>
            <Textarea
              id="reflection"
              {...register("reflection")}
              placeholder="The main devotional content..."
              rows={6}
            />
            {errors.reflection && (
              <p className="text-sm text-destructive">
                {errors.reflection.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prayer_prompt">Prayer Prompt</Label>
            <Textarea
              id="prayer_prompt"
              {...register("prayer_prompt")}
              placeholder="A prompt to guide prayer..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discussion_question">Discussion Question</Label>
            <Textarea
              id="discussion_question"
              {...register("discussion_question")}
              placeholder="A question for reflection or group discussion..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
