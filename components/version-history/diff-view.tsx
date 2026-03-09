'use client';

/**
 * VH-009: Diff View Component
 * 
 * A diff visualization component that shows differences between two versions
 * of content using diff-match-patch algorithm.
 * 
 * Features:
 * - Side-by-side (split) and unified view modes
 * - Green additions and red deletions
 * - Line numbers
 * - Keyboard navigation (N for next, Shift+N for previous)
 * - Syntax highlighting support
 * - Accessibility support
 * 
 * @bead clawd-kus.9
 * @spec VH-009
 */

import React, { 
  useCallback, 
  useEffect, 
  useMemo, 
  useRef, 
  useState,
  KeyboardEvent
} from 'react';
import diff_match_patch from 'diff-match-patch';
import { cn } from '@/lib/utils';

// =============================================================================
// Types & Interfaces
// =============================================================================

export type DiffMode = 'split' | 'unified';

export type SupportedLanguage = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'json' 
  | 'css' 
  | 'html' 
  | 'markdown'
  | 'text';

export type DiffLineType = 'addition' | 'deletion' | 'unchanged';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffChange {
  startLine: number;
  endLine: number;
  type: 'modification' | 'addition' | 'deletion';
}

export interface DiffViewProps {
  /** Original/old content to compare */
  oldContent: string;
  /** New/modified content to compare */
  newContent: string;
  /** Display mode: 'split' for side-by-side, 'unified' for inline */
  mode: DiffMode;
  /** Label for the old version panel */
  oldLabel?: string;
  /** Label for the new version panel */
  newLabel?: string;
  /** Whether to show the mode toggle buttons */
  showModeToggle?: boolean;
  /** Callback when mode is changed */
  onModeChange?: (mode: DiffMode) => void;
  /** Whether to show navigation buttons */
  showNavigation?: boolean;
  /** Callback when navigating between changes */
  onNavigateChange?: (direction: 'next' | 'prev') => void;
  /** Current change index (0-based) */
  currentChangeIndex?: number;
  /** Total number of changes */
  totalChanges?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Language for syntax highlighting */
  language?: SupportedLanguage;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// Diff Calculation Utilities
// =============================================================================

/**
 * Calculate line-based diff using diff-match-patch
 */
function calculateLineDiff(oldText: string, newText: string): DiffLine[] {
  const dmp = new diff_match_patch();
  
  // Convert to line-based diff
  const a = dmp.diff_linesToChars_(oldText, newText);
  const lineText1 = a.chars1;
  const lineText2 = a.chars2;
  const lineArray = a.lineArray;
  
  const diffs = dmp.diff_main(lineText1, lineText2, false);
  dmp.diff_charsToLines_(diffs, lineArray);
  
  const result: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  
  for (const [operation, text] of diffs) {
    const lines = text.split('\n').filter((line, index, arr) => {
      // Keep all lines except the trailing empty string from split
      return index < arr.length - 1 || line !== '';
    });
    
    for (const line of lines) {
      if (operation === 0) {
        // Unchanged
        result.push({
          type: 'unchanged',
          content: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++
        });
      } else if (operation === -1) {
        // Deletion
        result.push({
          type: 'deletion',
          content: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: undefined
        });
      } else if (operation === 1) {
        // Addition
        result.push({
          type: 'addition',
          content: line,
          oldLineNumber: undefined,
          newLineNumber: newLineNum++
        });
      }
    }
  }
  
  return result;
}

/**
 * Group diff lines into changes for navigation
 */
function findChanges(diffLines: DiffLine[]): DiffChange[] {
  const changes: DiffChange[] = [];
  let inChange = false;
  let changeStart = 0;
  let currentType: DiffChange['type'] | null = null;
  
  diffLines.forEach((line, index) => {
    if (line.type !== 'unchanged') {
      if (!inChange) {
        inChange = true;
        changeStart = index;
        currentType = line.type === 'addition' ? 'addition' : 
                      line.type === 'deletion' ? 'deletion' : 'modification';
      } else if (line.type !== currentType && currentType !== 'modification') {
        currentType = 'modification';
      }
    } else if (inChange) {
      changes.push({
        startLine: changeStart,
        endLine: index - 1,
        type: currentType!
      });
      inChange = false;
      currentType = null;
    }
  });
  
  // Handle change at end of file
  if (inChange) {
    changes.push({
      startLine: changeStart,
      endLine: diffLines.length - 1,
      type: currentType!
    });
  }
  
  return changes;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface LineNumberProps {
  lineNumber?: number;
  side: 'old' | 'new';
}

const LineNumber: React.FC<LineNumberProps> = ({ lineNumber, side }) => (
  <span 
    className="diff-line-number select-none text-right pr-2 text-gray-500 text-sm min-w-[3rem] inline-block"
    data-testid={lineNumber !== undefined ? `line-number-${side}` : undefined}
  >
    {lineNumber ?? ''}
  </span>
);

interface DiffLineRowProps {
  line: DiffLine;
  showLineNumbers: boolean;
  isFocused?: boolean;
  mode: DiffMode;
}

const DiffLineRow: React.FC<DiffLineRowProps> = ({ 
  line, 
  showLineNumbers, 
  isFocused,
  mode 
}) => {
  const baseClasses = cn(
    'diff-line font-mono text-sm whitespace-pre',
    isFocused && 'ring-2 ring-blue-500 ring-offset-1'
  );
  
  const typeClasses = {
    addition: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    deletion: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    unchanged: 'bg-transparent'
  };
  
  const typePrefix = {
    addition: '+',
    deletion: '-',
    unchanged: ' '
  };
  
  const testId = line.type === 'unchanged' ? 'diff-unchanged' :
                 line.type === 'addition' ? 'diff-addition' :
                 'diff-deletion';
  
  return (
    <div 
      className={cn(baseClasses, typeClasses[line.type])}
      data-testid={isFocused ? 'diff-change-focused' : testId}
    >
      {showLineNumbers && mode === 'unified' && (
        <>
          <LineNumber lineNumber={line.oldLineNumber} side="old" />
          <LineNumber lineNumber={line.newLineNumber} side="new" />
        </>
      )}
      {showLineNumbers && mode === 'split' && (
        <LineNumber 
          lineNumber={line.type === 'deletion' ? line.oldLineNumber : line.newLineNumber} 
          side={line.type === 'deletion' ? 'old' : 'new'} 
        />
      )}
      <span className="diff-prefix text-gray-500 pr-1">{typePrefix[line.type]}</span>
      <span className="diff-content">{line.content || '\u00A0'}</span>
    </div>
  );
};

// =============================================================================
// Navigation Component
// =============================================================================

interface NavigationProps {
  currentIndex: number;
  totalChanges: number;
  onNavigate: (direction: 'next' | 'prev') => void;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentIndex, 
  totalChanges, 
  onNavigate 
}) => (
  <div className="diff-navigation flex items-center gap-2 p-2 border-b">
    <button
      onClick={() => onNavigate('prev')}
      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-sm"
      aria-label="Previous change"
      disabled={totalChanges === 0}
    >
      ← Previous change
    </button>
    <span className="text-sm text-gray-600 dark:text-gray-400">
      {totalChanges > 0 ? `${currentIndex + 1} of ${totalChanges}` : 'No changes'}
    </span>
    <button
      onClick={() => onNavigate('next')}
      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-sm"
      aria-label="Next change"
      disabled={totalChanges === 0}
    >
      Next change →
    </button>
  </div>
);

// =============================================================================
// Mode Toggle Component
// =============================================================================

interface ModeToggleProps {
  currentMode: DiffMode;
  onModeChange: (mode: DiffMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ currentMode, onModeChange }) => (
  <div className="diff-mode-toggle flex gap-1 p-2 border-b">
    <button
      onClick={() => onModeChange('unified')}
      className={cn(
        'px-3 py-1 rounded text-sm',
        currentMode === 'unified' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
      )}
      aria-pressed={currentMode === 'unified'}
    >
      Unified
    </button>
    <button
      onClick={() => onModeChange('split')}
      className={cn(
        'px-3 py-1 rounded text-sm',
        currentMode === 'split' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
      )}
      aria-pressed={currentMode === 'split'}
    >
      Split
    </button>
  </div>
);

// =============================================================================
// Main DiffView Component
// =============================================================================

export const DiffView: React.FC<DiffViewProps> = ({
  oldContent,
  newContent,
  mode,
  oldLabel = 'Original',
  newLabel = 'Modified',
  showModeToggle = false,
  onModeChange,
  showNavigation = false,
  onNavigateChange,
  currentChangeIndex = 0,
  totalChanges: externalTotalChanges,
  showLineNumbers = true,
  language = 'text',
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalChangeIndex, setInternalChangeIndex] = useState(currentChangeIndex);
  
  // Calculate diff
  const diffLines = useMemo(
    () => calculateLineDiff(oldContent, newContent), 
    [oldContent, newContent]
  );
  
  // Find changes for navigation
  const changes = useMemo(
    () => findChanges(diffLines), 
    [diffLines]
  );
  
  const totalChanges = externalTotalChanges ?? changes.length;
  const activeChangeIndex = currentChangeIndex ?? internalChangeIndex;
  
  // Check if content is identical
  const hasNoChanges = diffLines.every(line => line.type === 'unchanged');
  
  // Split lines for side-by-side view
  const { leftLines, rightLines } = useMemo(() => {
    if (mode !== 'split') return { leftLines: [], rightLines: [] };
    
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];
    
    for (const line of diffLines) {
      if (line.type === 'unchanged') {
        left.push(line);
        right.push(line);
      } else if (line.type === 'deletion') {
        left.push(line);
        right.push({ type: 'unchanged', content: '', newLineNumber: undefined });
      } else if (line.type === 'addition') {
        left.push({ type: 'unchanged', content: '', oldLineNumber: undefined });
        right.push(line);
      }
    }
    
    return { leftLines: left, rightLines: right };
  }, [diffLines, mode]);
  
  // Navigation handler
  const handleNavigate = useCallback((direction: 'next' | 'prev') => {
    if (onNavigateChange) {
      onNavigateChange(direction);
    }
    
    setInternalChangeIndex(prev => {
      if (direction === 'next') {
        return Math.min(prev + 1, changes.length - 1);
      } else {
        return Math.max(prev - 1, 0);
      }
    });
  }, [onNavigateChange, changes.length]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      if (e.shiftKey) {
        handleNavigate('prev');
      } else {
        handleNavigate('next');
      }
    }
  }, [handleNavigate]);
  
  // Check if a line index is within the current focused change
  const isLineFocused = useCallback((lineIndex: number): boolean => {
    if (!showNavigation || changes.length === 0) return false;
    const change = changes[activeChangeIndex];
    return change && lineIndex >= change.startLine && lineIndex <= change.endLine;
  }, [showNavigation, changes, activeChangeIndex]);
  
  return (
    <div
      ref={containerRef}
      className={cn('diff-view-container border rounded-lg overflow-hidden', className)}
      data-testid="diff-view-container"
      data-language={language}
      role="region"
      aria-label="Diff view"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Screen reader status */}
      <div role="status" className="sr-only" aria-live="polite">
        {hasNoChanges 
          ? 'No changes between versions' 
          : `${totalChanges} changes found`}
      </div>
      
      {/* Mode Toggle */}
      {showModeToggle && onModeChange && (
        <ModeToggle currentMode={mode} onModeChange={onModeChange} />
      )}
      
      {/* Navigation */}
      {showNavigation && (
        <Navigation
          currentIndex={activeChangeIndex}
          totalChanges={totalChanges}
          onNavigate={handleNavigate}
        />
      )}
      
      {/* No changes message */}
      {hasNoChanges && (
        <div className="p-4 text-center text-gray-500">
          No changes between the two versions
        </div>
      )}
      
      {/* Unified View */}
      {mode === 'unified' && !hasNoChanges && (
        <div 
          className="diff-panel-unified p-2 overflow-auto"
          data-testid="diff-panel-unified"
        >
          {diffLines.map((line, index) => (
            <DiffLineRow
              key={index}
              line={line}
              showLineNumbers={showLineNumbers}
              isFocused={isLineFocused(index)}
              mode={mode}
            />
          ))}
        </div>
      )}
      
      {/* Split View */}
      {mode === 'split' && !hasNoChanges && (
        <div className="diff-split-container flex">
          {/* Left Panel (Old) */}
          <div 
            className="diff-panel-left flex-1 border-r overflow-auto"
            data-testid="diff-panel-left"
          >
            <div className="diff-panel-header p-2 bg-gray-100 dark:bg-gray-800 border-b text-sm font-medium">
              {oldLabel}
            </div>
            <div className="p-2">
              {leftLines.map((line, index) => (
                <DiffLineRow
                  key={index}
                  line={line}
                  showLineNumbers={showLineNumbers}
                  isFocused={isLineFocused(index)}
                  mode={mode}
                />
              ))}
            </div>
          </div>
          
          {/* Right Panel (New) */}
          <div 
            className="diff-panel-right flex-1 overflow-auto"
            data-testid="diff-panel-right"
          >
            <div className="diff-panel-header p-2 bg-gray-100 dark:bg-gray-800 border-b text-sm font-medium">
              {newLabel}
            </div>
            <div className="p-2">
              {rightLines.map((line, index) => (
                <DiffLineRow
                  key={index}
                  line={line}
                  showLineNumbers={showLineNumbers}
                  isFocused={isLineFocused(index)}
                  mode={mode}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiffView;
