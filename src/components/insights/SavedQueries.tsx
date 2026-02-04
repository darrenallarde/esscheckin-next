"use client";

import { Star, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useSavedQueries,
  useToggleQueryStar,
  useDeleteQuery,
  type SavedQuery,
} from "@/hooks/queries/use-saved-queries";
import { useTrack } from "@/lib/amplitude/hooks";
import { EVENTS } from "@/lib/amplitude/events";
import { formatDistanceToNow } from "date-fns";

interface SavedQueriesProps {
  organizationId: string | null;
  onSelectQuery: (queryText: string) => void;
  disabled?: boolean;
}

export function SavedQueries({
  organizationId,
  onSelectQuery,
  disabled,
}: SavedQueriesProps) {
  const track = useTrack();
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: queries, isLoading } = useSavedQueries(organizationId);
  const toggleStar = useToggleQueryStar();
  const deleteQuery = useDeleteQuery();

  if (!organizationId) return null;

  const starredQueries = queries?.filter((q) => q.isStarred) || [];
  const recentQueries = queries?.filter((q) => !q.isStarred) || [];

  const handleSelectQuery = (query: SavedQuery) => {
    if (disabled) return;

    track(EVENTS.INSIGHTS_SAVED_QUERY_USED, {
      query_id: query.id,
      query_text: query.queryText,
      is_starred: query.isStarred,
    });

    onSelectQuery(query.queryText);
  };

  const handleToggleStar = (query: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organizationId) return;

    track(query.isStarred ? EVENTS.INSIGHTS_QUERY_UNSTARRED : EVENTS.INSIGHTS_QUERY_STARRED, {
      query_id: query.id,
      query_text: query.queryText,
    });

    toggleStar.mutate({ queryId: query.id, orgId: organizationId });
  };

  const handleDelete = (query: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organizationId) return;

    deleteQuery.mutate({ queryId: query.id, orgId: organizationId });
  };

  if (isLoading) {
    return null;
  }

  if (!queries || queries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        <span>Recent Queries</span>
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {queries.length}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-4">
          {/* Starred Queries */}
          {starredQueries.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                Favorites
              </div>
              <div className="space-y-1">
                {starredQueries.map((query) => (
                  <QueryItem
                    key={query.id}
                    query={query}
                    disabled={disabled}
                    onSelect={handleSelectQuery}
                    onToggleStar={handleToggleStar}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Queries */}
          {recentQueries.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Recent
              </div>
              <div className="space-y-1">
                {recentQueries.slice(0, 5).map((query) => (
                  <QueryItem
                    key={query.id}
                    query={query}
                    disabled={disabled}
                    onSelect={handleSelectQuery}
                    onToggleStar={handleToggleStar}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface QueryItemProps {
  query: SavedQuery;
  disabled?: boolean;
  onSelect: (query: SavedQuery) => void;
  onToggleStar: (query: SavedQuery, e: React.MouseEvent) => void;
  onDelete: (query: SavedQuery, e: React.MouseEvent) => void;
}

function QueryItem({
  query,
  disabled,
  onSelect,
  onToggleStar,
  onDelete,
}: QueryItemProps) {
  return (
    <div
      onClick={() => onSelect(query)}
      className={cn(
        "group flex items-center justify-between gap-2 p-2 rounded-lg border border-transparent",
        "hover:bg-muted hover:border-border cursor-pointer transition-colors",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{query.queryText}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(query.lastUsedAt), { addSuffix: true })}
          {query.useCount > 1 && ` · used ${query.useCount} times`}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => onToggleStar(query, e)}
        >
          <Star
            className={cn(
              "h-4 w-4",
              query.isStarred
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            )}
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => onDelete(query, e)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
