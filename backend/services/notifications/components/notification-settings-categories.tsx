'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, ToggleLeft, ToggleRight } from 'lucide-react';

export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export interface NotificationSettingsCategoriesProps {
  categories: NotificationCategory[];
  onToggle: (id: string) => void;
}

export function NotificationSettingsCategories({
  categories,
  onToggle,
}: NotificationSettingsCategoriesProps) {
  const enabledCategoryCount = categories.filter(c => c.enabled).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Bell size={20} />
        Notification Categories
      </h2>

      <p className="text-slate-600 text-sm mb-4">
        Enable or disable notifications by category
      </p>

      <div className="space-y-3">
        {categories.map(category => (
          <button
            key={category.id}
            type="button"
            onClick={() => onToggle(category.id)}
            className="w-full p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="text-slate-600">{category.icon}</div>
              <div>
                <h3 className="font-medium text-slate-900">{category.name}</h3>
                <p className="text-sm text-slate-500">{category.description}</p>
              </div>
            </div>
            {category.enabled ? (
              <ToggleRight className="text-blue-600" size={24} />
            ) : (
              <ToggleLeft className="text-slate-400" size={24} />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>{enabledCategoryCount}</strong> categor{enabledCategoryCount !== 1 ? 'ies' : 'y'} enabled
        </p>
      </div>
    </motion.section>
  );
}
