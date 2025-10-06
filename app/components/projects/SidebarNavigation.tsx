"use client";

import { useState } from "react";

interface SidebarNavigationProps {
  stretchGoalAmount?: number;
  onSectionClick?: (section: string) => void;
}

export function SidebarNavigation({ stretchGoalAmount, onSectionClick }: SidebarNavigationProps) {
  const [activeSection, setActiveSection] = useState("WHAT");

  const handleSectionClick = (section: string) => {
    setActiveSection(section);
    onSectionClick?.(section);
  };

  const sections = ["WHAT", "WHO", "WHY", "HOW"];
  const additionalItems = ["THE TEAM", "MY WORK", "Risks"];

  return (
    <div className="lg:col-span-1">
      <div className="space-y-6">
        {/* What/Who/Why/How Navigation */}
        <div className="space-y-2">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className={`block w-full text-left text-lg font-medium hover:text-green-600 ${
                activeSection === section ? "text-gray-900" : "text-gray-600"
              }`}
            >
              {section}?
            </button>
          ))}
        </div>

        {stretchGoalAmount && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => handleSectionClick("STRETCH_GOAL")}
              className="block w-full text-left text-sm font-medium text-gray-900 hover:text-green-600"
            >
              STRETCH GOAL of ${stretchGoalAmount.toLocaleString()}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {additionalItems.map((item) => (
            <button
              key={item}
              onClick={() => handleSectionClick(item)}
              className="block w-full text-left text-sm font-medium text-gray-600 hover:text-green-600"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
