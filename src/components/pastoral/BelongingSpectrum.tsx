import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BelongingDistribution, BelongingStatus } from '@/types/pastoral';

interface BelongingSpectrumProps {
  distribution: BelongingDistribution;
  totalStudents: number;
  onFilterChange?: (status: BelongingStatus | 'all') => void;
  selectedFilter?: BelongingStatus | 'all';
}

const BelongingSpectrum: React.FC<BelongingSpectrumProps> = ({
  distribution,
  totalStudents,
  onFilterChange,
  selectedFilter = 'all'
}) => {
  const [hoveredStatus, setHoveredStatus] = useState<BelongingStatus | null>(null);
  const statusColors = {
    'Ultra-Core': '#3B82F6',     // Blue
    'Core': '#10B981',            // Green
    'Connected': '#14B8A6',       // Teal
    'On the Fringe': '#FBBF24',  // Yellow
    'Missing': '#EF4444'          // Red
  };

  const statusOrder: Array<keyof BelongingDistribution> = [
    'Ultra-Core',
    'Core',
    'Connected',
    'On the Fringe',
    'Missing'
  ];

  const statusDescriptions = {
    'Ultra-Core': 'Highly engaged - 5+ check-ins in last 4 weeks',
    'Core': 'Consistent - 4+ check-ins in 8 weeks (~1x/week)',
    'Connected': 'Periodic - 2-3 check-ins in 8 weeks',
    'On the Fringe': 'Not seen in 30-59 days - needs immediate outreach',
    'Missing': 'Not seen in 60+ days - urgent parent contact needed'
  };

  const calculatePercentage = (count: number) => {
    if (totalStudents === 0) return 0;
    return Math.round((count / totalStudents) * 100);
  };

  const handleStatusClick = (status: BelongingStatus) => {
    if (onFilterChange) {
      // Toggle: if already selected, clear filter; otherwise select this status
      onFilterChange(selectedFilter === status ? 'all' : status);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center justify-between">
          <span>Belonging Spectrum</span>
          {selectedFilter !== 'all' && (
            <button
              onClick={() => onFilterChange && onFilterChange('all')}
              className="text-sm font-normal text-blue-600 hover:text-blue-800 underline"
            >
              Clear Filter
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stacked Bar Chart */}
        <div className="mb-6 relative">
          <div className="flex w-full h-20 rounded-lg overflow-hidden shadow-lg border-2 border-gray-300">
            {statusOrder.map((status) => {
              const count = distribution[status];
              const percentage = calculatePercentage(count);
              const isSelected = selectedFilter === status;
              const isHovered = hoveredStatus === status;

              if (percentage === 0) return null;

              return (
                <div
                  key={status}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: statusColors[status]
                  }}
                  className={`
                    relative flex items-center justify-center text-white font-bold text-sm
                    transition-all duration-200 cursor-pointer
                    ${isSelected ? 'ring-4 ring-yellow-400 ring-inset scale-105 z-10' : 'hover:opacity-90 hover:scale-105'}
                    ${isHovered ? 'shadow-2xl z-20' : ''}
                  `}
                  onClick={() => handleStatusClick(status)}
                  onMouseEnter={() => setHoveredStatus(status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  title={`Click to filter by ${status}`}
                >
                  <div className="text-center px-1">
                    {percentage >= 8 ? `${percentage}%` : ''}
                  </div>

                  {/* Hover Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                      style={{ width: 'max-content', maxWidth: '280px' }}
                    >
                      <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl border border-gray-700">
                        <div className="font-bold mb-1 text-sm">{status}</div>
                        <div className="text-gray-300 mb-2">{statusDescriptions[status]}</div>
                        <div className="flex justify-between gap-4 pt-2 border-t border-gray-700">
                          <span className="font-semibold">{count} students</span>
                          <span className="text-gray-400">{percentage}%</span>
                        </div>
                        <div className="text-center mt-2 text-gray-400 text-xs">
                          Click to filter →
                        </div>
                      </div>
                      {/* Arrow pointing up */}
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
                        style={{
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderBottom: '8px solid #1f2937'
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statusOrder.map((status) => {
            const count = distribution[status];
            const percentage = calculatePercentage(count);
            const isSelected = selectedFilter === status;

            return (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                className={`
                  flex flex-col items-center p-3 rounded-lg transition-all duration-200
                  ${isSelected
                    ? 'bg-yellow-100 ring-2 ring-yellow-400 scale-105'
                    : 'bg-muted/30 hover:bg-muted/50 hover:scale-105'}
                  cursor-pointer
                `}
              >
                <div
                  className="w-4 h-4 rounded-full mb-2"
                  style={{ backgroundColor: statusColors[status] }}
                />
                <div className="text-sm font-semibold text-center mb-1">{status}</div>
                <div className="text-2xl font-bold" style={{ color: statusColors[status] }}>
                  {percentage}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {count} {count === 1 ? 'student' : 'students'}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BelongingSpectrum;
