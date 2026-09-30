'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Moon, ToggleLeft, ToggleRight } from 'lucide-react';

export interface NotificationSettingsQuietHoursProps {
  doNotDisturb: boolean;
  dndTime: {
    start: number;
    end: number;
  };
  onToggleDnd: () => void;
  onDndTimeChange: (type: 'start' | 'end', value: number) => void;
}

export function NotificationSettingsQuietHours({
  doNotDisturb,
  dndTime,
  onToggleDnd,
  onDndTimeChange,
}: NotificationSettingsQuietHoursProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Moon size={20} />
        Quiet Hours
      </h2>

      <div className="space-y-4">
        <button
          type="button"
          onClick={onToggleDnd}
          className="w-full p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
        >
          <div className="text-left">
            <h3 className="font-medium text-slate-900">Do Not Disturb</h3>
            <p className="text-sm text-slate-500 mt-1">
              Temporarily pause all notifications
            </p>
          </div>
          {doNotDisturb ? (
            <ToggleRight className="text-blue-600" size={24} />
          ) : (
            <ToggleLeft className="text-slate-400" size={24} />
          )}
        </button>

        {doNotDisturb && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Start Time (Quiet Hours)
              </label>
              <select
                aria-label="Start Time (Quiet Hours)"
                value={dndTime.start}
                onChange={(e) => onDndTimeChange('start', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                End Time
              </label>
              <select
                aria-label="End Time"
                value={dndTime.end}
                onChange={(e) => onDndTimeChange('end', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <p className="text-sm text-slate-600 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              Notifications will be silenced from {String(dndTime.start).padStart(2, '0')}:00 to{' '}
              {String(dndTime.end).padStart(2, '0')}:00 in your timezone
            </p>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
