"use client";

import { Heart, MessageCircle, Mic, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  useMyPrayerRequests,
  type MyPrayerRequest,
  type MyPrayerResponse,
} from "@/hooks/queries/use-my-prayer-requests";

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

function ResponseBadge({ response }: { response: MyPrayerResponse }) {
  const isNew = !response.viewed_at;

  return (
    <Link
      href={`/d/prayer/${response.response_id}`}
      className="flex items-center gap-2 bg-stone-50 hover:bg-stone-100 transition-colors rounded-lg px-3 py-2"
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {response.response_type === "voice" ? (
          <Mic className="h-3.5 w-3.5 text-stone-500 shrink-0" />
        ) : response.response_type === "text" ? (
          <MessageCircle className="h-3.5 w-3.5 text-stone-500 shrink-0" />
        ) : (
          <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        )}
        <span className="text-sm text-stone-700 truncate">
          {response.responder_name}
        </span>
        {isNew && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
            New
          </span>
        )}
      </div>
      <span className="text-xs text-stone-400 shrink-0">
        {timeAgo(response.created_at)}
      </span>
    </Link>
  );
}

export function StudentPrayerList() {
  const { data: prayers, isLoading } = useMyPrayerRequests();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!prayers || prayers.length === 0) {
    return (
      <div className="text-center py-8">
        <Heart className="h-8 w-8 text-stone-300 mx-auto mb-2" />
        <p className="text-sm text-stone-500">
          No prayer requests yet. Share what&apos;s on your heart on a
          devotional page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prayers.map((prayer: MyPrayerRequest) => (
        <div
          key={prayer.engagement_id}
          className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
        >
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
              &ldquo;{prayer.prayer_request}&rdquo;
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {prayer.devotional_title} &middot; {timeAgo(prayer.prayed_at)}
            </p>
          </div>

          {prayer.responses.length > 0 && (
            <div className="px-4 pb-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Responses ({prayer.responses.length})
              </p>
              {prayer.responses.map((response: MyPrayerResponse) => (
                <ResponseBadge key={response.response_id} response={response} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
