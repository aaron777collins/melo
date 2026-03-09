'use client';

/**
 * Test page for VH-009: Diff View Component
 * Used for visual testing and screenshots
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DiffView, DiffMode } from '@/components/version-history/diff-view';

const oldContent = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

function farewell() {
  console.log("Goodbye");
}`;

const newContent = `function greet(name) {
  console.log("Hello, " + name + "!");
  console.log("Welcome!");
  return true;
}

function farewell(name) {
  console.log("Goodbye, " + name);
}

function newFunction() {
  return "I am new";
}`;

export default function DiffViewTestPage() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get('mode') as DiffMode) || 'split';
  const showNav = searchParams.get('nav') === 'true';
  const showToggle = searchParams.get('toggle') === 'true';

  const [mode, setMode] = useState<DiffMode>(initialMode);
  const [currentChange, setCurrentChange] = useState(0);

  const handleNavigate = (direction: 'next' | 'prev') => {
    setCurrentChange(prev => 
      direction === 'next' ? Math.min(prev + 1, 5) : Math.max(prev - 1, 0)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          VH-009: Diff View Test Page
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <DiffView
            oldContent={oldContent}
            newContent={newContent}
            mode={mode}
            oldLabel="Version 1 (Original)"
            newLabel="Version 2 (Modified)"
            showModeToggle={showToggle}
            onModeChange={setMode}
            showNavigation={showNav}
            onNavigateChange={handleNavigate}
            currentChangeIndex={currentChange}
            showLineNumbers={true}
            language="javascript"
          />
        </div>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>Query params:</p>
          <ul className="list-disc ml-5">
            <li><code>mode=unified|split</code> - Initial view mode</li>
            <li><code>nav=true</code> - Show navigation controls</li>
            <li><code>toggle=true</code> - Show mode toggle</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
