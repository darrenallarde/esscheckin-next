"use client";

import { useState, useEffect, useRef } from "react";
import {
  Heart,
  Send,
  Loader2,
  MessageCircle,
  Play,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  usePrayerResponseDetail,
  useMarkResponseViewed,
  useLikePrayerResponse,
  useAddPrayerComment,
  type PrayerResponseDetail,
} from "@/hooks/queries/use-prayer-response";
import { createClient } from "@/lib/supabase/client";

interface PrayerResponsePageProps {
  responseId: string;
  initialData: PrayerResponseDetail;
}

export function PrayerResponsePage({
  responseId,
  initialData,
}: PrayerResponsePageProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localLiked, setLocalLiked] = useState(!!initialData.liked_at);
  const hasMarkedViewed = useRef(false);

  const { data: liveData } = usePrayerResponseDetail(responseId);
  const markViewed = useMarkResponseViewed();
  const likeMutation = useLikePrayerResponse();
  const commentMutation = useAddPrayerComment();

  const detail = liveData || initialData;

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        if (session.user.id === detail.prayer_author_user_id) {
          setIsAuthor(true);
        }
      }
    };
    checkAuth();
  }, [detail.prayer_author_user_id]);

  // Mark viewed when author visits
  useEffect(() => {
    if (isAuthor && !hasMarkedViewed.current && !detail.viewed_at) {
      hasMarkedViewed.current = true;
      markViewed.mutate(responseId);
    }
  }, [isAuthor, responseId, detail.viewed_at, markViewed]);

  // Sync liked state from server
  useEffect(() => {
    if (liveData) {
      setLocalLiked(!!liveData.liked_at);
    }
  }, [liveData]);

  const handleLike = async () => {
    setLocalLiked(!localLiked);
    const result = await likeMutation.mutateAsync(responseId);
    if (result.success) {
      setLocalLiked(result.liked);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    const result = await commentMutation.mutateAsync({
      responseId,
      commentText: commentText.trim(),
    });
    if (result.success) {
      setCommentText("");
    }
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Prayer Response
          </p>
          <p className="text-sm text-muted-foreground">
            {detail.devotional_title}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Prayer response card */}
        <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
              <Heart className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">
                {detail.responder_name} prayed for you
              </p>
              <p className="text-xs text-stone-500">
                {timeAgo(detail.created_at)}
              </p>
            </div>
          </div>

          {/* Response content */}
          {detail.response_type === "text" && detail.message && (
            <div className="bg-stone-50 rounded-lg p-4">
              <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                {detail.message}
              </p>
            </div>
          )}

          {detail.response_type === "voice" && detail.voice_url && (
            <div className="bg-stone-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4 text-stone-500" />
                <span className="text-xs text-stone-500">Voice prayer</span>
              </div>
              <audio src={detail.voice_url} controls className="w-full h-10" />
            </div>
          )}

          {detail.response_type === "pray" && (
            <div className="bg-rose-50 rounded-lg p-4 text-center">
              <p className="text-sm text-rose-800">
                {detail.responder_name} lifted your request to God in prayer.
              </p>
            </div>
          )}

          {/* Original prayer request context */}
          <div className="border-t border-stone-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
              Your prayer request
            </p>
            <p className="text-sm text-stone-600 italic">
              &ldquo;{detail.prayer_request}&rdquo;
            </p>
          </div>
        </section>

        {/* Author actions */}
        {isAuthor && (
          <section className="space-y-4">
            {/* Like button */}
            <Button
              onClick={handleLike}
              disabled={likeMutation.isPending}
              variant="outline"
              className="w-full py-6"
            >
              <Heart
                className={`h-5 w-5 mr-2 transition-colors ${
                  localLiked ? "fill-rose-500 text-rose-500" : "text-stone-400"
                }`}
              />
              {localLiked ? "Loved" : "Love this"}
            </Button>

            {/* Comments */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-stone-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Comments
                  </span>
                </div>

                {/* Existing comments */}
                {detail.comments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {detail.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-stone-50 rounded-lg px-3 py-2"
                      >
                        <p className="text-sm text-stone-800">
                          {comment.comment_text}
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                          {comment.author_name} &middot;{" "}
                          {timeAgo(comment.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment input */}
              <div className="px-5 pb-4">
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-transparent"
                  />
                  <Button
                    onClick={handleComment}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    size="sm"
                    className="self-end bg-stone-900 hover:bg-stone-800"
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Not authenticated or not author */}
        {!isAuthor && !userId && (
          <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm text-center space-y-3">
            <p className="text-sm text-stone-600">
              Sign in to respond to this prayer.
            </p>
            <Link
              href={`/d/${detail.devotional_id}`}
              className="inline-block text-sm text-stone-900 font-medium underline underline-offset-2 hover:text-stone-700"
            >
              Go to devotional
            </Link>
          </section>
        )}

        {/* Viewed indicator */}
        {detail.viewed_at && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Seen</span>
          </div>
        )}
      </main>
    </div>
  );
}
