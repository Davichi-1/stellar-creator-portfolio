/**
 * Notification Settings Page
 * Allows users to configure notification preferences, quiet hours, and delivery channels
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  Save,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import {
  NotificationSettingsChannels,
  NotificationChannel,
} from './components/notification-settings-channels';
import {
  NotificationSettingsCategories,
  NotificationCategory,
} from './components/notification-settings-categories';
import { NotificationSettingsQuietHours } from './components/notification-settings-quiet-hours';

export type { NotificationChannel, NotificationCategory };

export interface UserPreferences {
  channels: Record<NotificationChannel, boolean>;
  quietHours?: {
    start: number;
    end: number;
  };
  doNotDisturb: boolean;
  dndSchedule?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  blockedCategories: string[];
  language: string;
  timezone: string;
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    channels: {
      firebase: true,
      onesignal: true,
      browser: true,
      email: true,
    },
    doNotDisturb: false,
    blockedCategories: [],
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'messages',
      name: 'Messages',
      description: 'New messages and chats',
      icon: <Mail size={20} />,
      enabled: true,
    },
    {
      id: 'updates',
      name: 'System Updates',
      description: 'Application updates and maintenance',
      icon: <Smartphone size={20} />,
      enabled: true,
    },
    {
      id: 'reminders',
      name: 'Reminders',
      description: 'Task and meeting reminders',
      icon: <Clock size={20} />,
      enabled: true,
    },
    {
      id: 'alerts',
      name: 'Alerts',
      description: 'Security alerts and warnings',
      icon: <AlertCircle size={20} />,
      enabled: true,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dndTime, setDndTime] = useState({
    start: preferences.quietHours?.start || 22,
    end: preferences.quietHours?.end || 7,
  });

  const handleChannelToggle = (channel: NotificationChannel) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const handleCategoryToggle = (id: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, enabled: !cat.enabled } : cat
      )
    );

    setPreferences(prev => ({
      ...prev,
      blockedCategories: preferences.blockedCategories.includes(id)
        ? prev.blockedCategories.filter(c => c !== id)
        : [...prev.blockedCategories, id],
    }));
  };

  const handleDndToggle = () => {
    setPreferences(prev => ({
      ...prev,
      doNotDisturb: !prev.doNotDisturb,
    }));
  };

  const handleDndTimeChange = (type: 'start' | 'end', value: number) => {
    setDndTime(prev => ({
      ...prev,
      [type]: value,
    }));

    setPreferences(prev => ({
      ...prev,
      quietHours: {
        start: type === 'start' ? value : dndTime.start,
        end: type === 'end' ? value : dndTime.end,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Make API call to save preferences
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to default preferences
    setPreferences({
      channels: {
        firebase: true,
        onesignal: true,
        browser: true,
        email: true,
      },
      doNotDisturb: false,
      blockedCategories: [],
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Notification Settings
              </h1>
              <p className="text-slate-600 mt-1">
                Manage how you receive notifications across all channels
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status Message */}
        <AnimatePresence>
          {saveStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                saveStatus === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  saveStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                <span className="text-white text-xs">✓</span>
              </div>
              <span
                className={saveStatus === 'success' ? 'text-green-700' : 'text-red-700'}
              >
                {saveStatus === 'success'
                  ? 'Preferences saved successfully'
                  : 'Failed to save preferences'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Channels */}
        <NotificationSettingsChannels
          channels={preferences.channels}
          onToggle={handleChannelToggle}
        />

        {/* Notification Categories */}
        <NotificationSettingsCategories
          categories={categories}
          onToggle={handleCategoryToggle}
        />

        {/* Quiet Hours & Do Not Disturb */}
        <NotificationSettingsQuietHours
          doNotDisturb={preferences.doNotDisturb}
          dndTime={dndTime}
          onToggleDnd={handleDndToggle}
          onDndTimeChange={handleDndTimeChange}
        />

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3"
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Reset to Default
          </button>
        </motion.div>
      </div>
    </div>
  );
}
