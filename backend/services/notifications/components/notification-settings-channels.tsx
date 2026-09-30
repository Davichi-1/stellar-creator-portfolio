'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Chrome, Mail, ToggleLeft, ToggleRight } from 'lucide-react';

export type NotificationChannel = 'firebase' | 'onesignal' | 'browser' | 'email';

export interface NotificationSettingsChannelsProps {
  channels: Record<NotificationChannel, boolean>;
  onToggle: (channel: NotificationChannel) => void;
}

const AVAILABLE_CHANNELS: {
  id: NotificationChannel;
  name: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'firebase',
    name: 'Firebase Cloud Messaging',
    description: 'Mobile app notifications',
    icon: <Smartphone size={18} />,
  },
  {
    id: 'browser',
    name: 'Browser Push',
    description: 'Desktop browser notifications',
    icon: <Chrome size={18} />,
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Email notifications',
    icon: <Mail size={18} />,
  },
];

export function NotificationSettingsChannels({
  channels,
  onToggle,
}: NotificationSettingsChannelsProps) {
  const enabledChannelCount = Object.values(channels).filter(Boolean).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Smartphone size={20} />
        Notification Channels
      </h2>

      <p className="text-slate-600 text-sm mb-4">
        Choose how you want to receive notifications
      </p>

      <div className="space-y-3">
        {AVAILABLE_CHANNELS.map(channel => (
          <button
            key={channel.id}
            type="button"
            onClick={() => onToggle(channel.id)}
            className="w-full p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="text-slate-600">{channel.icon}</div>
              <div>
                <h3 className="font-medium text-slate-900">{channel.name}</h3>
                <p className="text-sm text-slate-500">{channel.description}</p>
              </div>
            </div>
            {channels[channel.id] ? (
              <ToggleRight className="text-blue-600" size={24} />
            ) : (
              <ToggleLeft className="text-slate-400" size={24} />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>{enabledChannelCount}</strong> channel{enabledChannelCount !== 1 ? 's' : ''} enabled
        </p>
      </div>
    </motion.section>
  );
}
