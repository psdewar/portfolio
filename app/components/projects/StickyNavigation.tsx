"use client";

import { useState } from "react";

interface NavigationTab {
  label: string;
  badge?: number;
}

interface StickyNavigationProps {
  tabs: NavigationTab[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

export function StickyNavigation({ tabs, activeTab = 0, onTabChange }: StickyNavigationProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleTabClick = (index: number) => {
    setCurrentTab(index);
    onTabChange?.(index);
  };

  return (
    <div className="mt-8 sticky top-0 bg-white z-40 border-b border-gray-200 -mx-4 px-4">
      <div className="flex items-center justify-between py-3">
        <nav className="flex space-x-8">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => handleTabClick(index)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                index === currentTab
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1 rounded">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          Save
        </button>
      </div>
    </div>
  );
}
