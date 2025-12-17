import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  InteractionType,
  InteractionStatus,
  INTERACTION_TYPE_CONFIG,
  INTERACTION_STATUS_CONFIG,
} from '@/types/interactions';
import { MessageSquare, Phone, Instagram, Users, Mail, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TimelineInteraction {
  id: string;
  type: InteractionType;
  status: InteractionStatus;
  content: string | null;
  outcome: string | null;
  leader_name: string | null;
  created_at: string;
  completed_at: string | null;
}

interface InteractionTimelineProps {
  interactions: TimelineInteraction[];
  showEmpty?: boolean;
  maxItems?: number;
}

const getIcon = (type: InteractionType) => {
  const iconClass = "w-4 h-4";
  switch (type) {
    case 'text': return <MessageSquare className={iconClass} />;
    case 'call': return <Phone className={iconClass} />;
    case 'instagram_dm': return <Instagram className={iconClass} />;
    case 'in_person': return <Users className={iconClass} />;
    case 'parent_contact': return <Phone className={iconClass} />;
    case 'email': return <Mail className={iconClass} />;
    default: return <FileText className={iconClass} />;
  }
};

const getStatusIcon = (status: InteractionStatus) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
    case 'pending': return <Clock className="w-3 h-3 text-yellow-600" />;
    case 'no_response': return <XCircle className="w-3 h-3 text-red-500" />;
    case 'scheduled': return <AlertCircle className="w-3 h-3 text-blue-500" />;
  }
};

const InteractionTimeline: React.FC<InteractionTimelineProps> = ({
  interactions,
  showEmpty = true,
  maxItems = 5,
}) => {
  const displayInteractions = interactions.slice(0, maxItems);

  if (interactions.length === 0 && showEmpty) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No interactions logged yet</p>
        <p className="text-xs">Be the first to reach out!</p>
      </div>
    );
  }

  if (interactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {displayInteractions.map((interaction, index) => {
        const config = INTERACTION_TYPE_CONFIG[interaction.type];
        const isLast = index === displayInteractions.length - 1;

        return (
          <div key={interaction.id} className="relative">
            {/* Timeline connector */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200" />
            )}

            <div className="flex gap-3">
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                {getIcon(interaction.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {config.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    {getStatusIcon(interaction.status)}
                    <span className={INTERACTION_STATUS_CONFIG[interaction.status].color.replace('bg-', 'text-').replace('-100', '-700')}>
                      {INTERACTION_STATUS_CONFIG[interaction.status].label}
                    </span>
                  </span>
                </div>

                {/* Who and when */}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {interaction.leader_name && (
                    <span>{interaction.leader_name} • </span>
                  )}
                  <span title={new Date(interaction.created_at).toLocaleString()}>
                    {formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Content preview */}
                {interaction.content && (
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2 italic">
                    "{interaction.content}"
                  </p>
                )}

                {/* Outcome */}
                {interaction.outcome && (
                  <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                    <span className="font-medium">Outcome:</span> {interaction.outcome}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {interactions.length > maxItems && (
        <div className="text-center">
          <button className="text-xs text-primary hover:underline">
            View all {interactions.length} interactions
          </button>
        </div>
      )}
    </div>
  );
};

export default InteractionTimeline;
