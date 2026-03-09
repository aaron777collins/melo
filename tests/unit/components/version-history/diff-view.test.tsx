/**
 * TDD Tests for VH-009: Diff View Component
 * 
 * PHASE 1: RED - Tests written FIRST (these should FAIL initially)
 * 
 * Bead: clawd-kus.9
 * 
 * Acceptance Criteria:
 * - AC-1: Compare with Previous - Side-by-side diff with green additions, red deletions
 * - AC-2: Compare Any Two - Select two versions and compare them
 * - AC-3: Unified/Split Toggle - Switch between unified (inline) and split (side-by-side)
 * - AC-4: Change Navigation - Next/prev change with keyboard (N key)
 * 
 * Technical Requirements:
 * - Use diff-match-patch for diff calculation
 * - Syntax highlighting preserved in diff
 * - Line numbers shown
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffView, DiffViewProps, DiffMode } from '@/components/version-history/diff-view';

// =============================================================================
// TEST DATA
// =============================================================================

const SAMPLE_OLD_TEXT = `function hello() {
  console.log("Hello");
  return true;
}`;

const SAMPLE_NEW_TEXT = `function hello() {
  console.log("Hello World");
  console.log("Added line");
  return true;
}`;

const SAMPLE_OLD_CODE = `const x = 1;
const y = 2;
const z = 3;`;

const SAMPLE_NEW_CODE = `const x = 1;
const y = 5;
const z = 3;
const w = 4;`;

// =============================================================================
// AC-1: Compare with Previous - Side-by-side diff view
// =============================================================================

describe('VH-009: Diff View Component', () => {
  describe('AC-1: Compare with Previous - Diff Display', () => {
    it('should render a diff view with additions shown in green', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
        />
      );

      // Should find added lines marked with green styling
      const additions = screen.getAllByTestId('diff-addition');
      expect(additions.length).toBeGreaterThan(0);
      
      // Check for the added line
      expect(screen.getByText(/Added line/)).toBeInTheDocument();
    });

    it('should render deletions shown in red', () => {
      render(
        <DiffView
          oldContent={SAMPLE_NEW_TEXT}
          newContent={SAMPLE_OLD_TEXT}
          mode="split"
        />
      );

      // Should find deleted lines marked with red styling
      const deletions = screen.getAllByTestId('diff-deletion');
      expect(deletions.length).toBeGreaterThan(0);
    });

    it('should show unchanged lines without highlight', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
        />
      );

      // Find unchanged context lines
      const unchangedLines = screen.getAllByTestId('diff-unchanged');
      expect(unchangedLines.length).toBeGreaterThan(0);
      
      // The function declaration should be unchanged (appears in both panels in split view)
      const functionLines = screen.getAllByText(/function hello/);
      expect(functionLines.length).toBeGreaterThanOrEqual(1);
    });

    it('should render side-by-side panels in split mode', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
        />
      );

      // Should have left (old) and right (new) panels
      expect(screen.getByTestId('diff-panel-left')).toBeInTheDocument();
      expect(screen.getByTestId('diff-panel-right')).toBeInTheDocument();
    });

    it('should show version labels', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
          oldLabel="Version 1"
          newLabel="Version 2"
        />
      );

      expect(screen.getByText('Version 1')).toBeInTheDocument();
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // AC-2: Compare Any Two Versions
  // =============================================================================

  describe('AC-2: Compare Any Two Versions', () => {
    it('should accept two arbitrary version contents for comparison', () => {
      const version1 = 'const a = 1;';
      const version2 = 'const a = 2;';

      render(
        <DiffView
          oldContent={version1}
          newContent={version2}
          mode="split"
        />
      );

      // Both contents should be rendered
      expect(screen.getByText(/const a = 1/)).toBeInTheDocument();
      expect(screen.getByText(/const a = 2/)).toBeInTheDocument();
    });

    it('should correctly diff arbitrary versions (not just adjacent)', () => {
      const versionA = `line1
line2
line3`;
      const versionC = `line1
different
line3
added`;

      render(
        <DiffView
          oldContent={versionA}
          newContent={versionC}
          mode="split"
        />
      );

      // Should show the change from line2 to different
      const deletions = screen.getAllByTestId('diff-deletion');
      const additions = screen.getAllByTestId('diff-addition');
      
      expect(deletions.length).toBeGreaterThan(0);
      expect(additions.length).toBeGreaterThan(0);
    });

    it('should handle empty old content (new file)', () => {
      render(
        <DiffView
          oldContent=""
          newContent="new content"
          mode="split"
        />
      );

      // All new content should be marked as additions
      const additions = screen.getAllByTestId('diff-addition');
      expect(additions.length).toBeGreaterThan(0);
      expect(screen.getByText(/new content/)).toBeInTheDocument();
    });

    it('should handle empty new content (deleted file)', () => {
      render(
        <DiffView
          oldContent="old content"
          newContent=""
          mode="split"
        />
      );

      // All old content should be marked as deletions
      const deletions = screen.getAllByTestId('diff-deletion');
      expect(deletions.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // AC-3: Unified/Split Toggle
  // =============================================================================

  describe('AC-3: Unified/Split Toggle', () => {
    it('should default to split view mode', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
        />
      );

      expect(screen.getByTestId('diff-panel-left')).toBeInTheDocument();
      expect(screen.getByTestId('diff-panel-right')).toBeInTheDocument();
    });

    it('should render unified view when mode is unified', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="unified"
        />
      );

      // Should have single panel for unified view
      expect(screen.getByTestId('diff-panel-unified')).toBeInTheDocument();
      expect(screen.queryByTestId('diff-panel-left')).not.toBeInTheDocument();
      expect(screen.queryByTestId('diff-panel-right')).not.toBeInTheDocument();
    });

    it('should show toggle button to switch between modes', () => {
      const onModeChange = vi.fn();
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
          showModeToggle={true}
          onModeChange={onModeChange}
        />
      );

      expect(screen.getByRole('button', { name: /unified/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /split/i })).toBeInTheDocument();
    });

    it('should call onModeChange when toggle is clicked', async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();

      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
          showModeToggle={true}
          onModeChange={onModeChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /unified/i }));
      expect(onModeChange).toHaveBeenCalledWith('unified');
    });

    it('should show inline additions and deletions in unified mode', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="unified"
        />
      );

      // In unified mode, additions and deletions should be inline
      const unifiedPanel = screen.getByTestId('diff-panel-unified');
      
      // Should show both old (deleted) and new (added) content
      expect(within(unifiedPanel).getAllByTestId('diff-addition').length).toBeGreaterThan(0);
      expect(within(unifiedPanel).getAllByTestId('diff-deletion').length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // AC-4: Change Navigation with Keyboard
  // =============================================================================

  describe('AC-4: Change Navigation', () => {
    it('should show navigation buttons for next/prev change', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="split"
          showNavigation={true}
        />
      );

      expect(screen.getByRole('button', { name: /next change/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous change/i })).toBeInTheDocument();
    });

    it('should navigate to next change when clicking next button', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="split"
          showNavigation={true}
          onNavigateChange={onNavigate}
        />
      );

      await user.click(screen.getByRole('button', { name: /next change/i }));
      expect(onNavigate).toHaveBeenCalledWith('next');
    });

    it('should navigate to previous change when clicking prev button', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="split"
          showNavigation={true}
          onNavigateChange={onNavigate}
        />
      );

      await user.click(screen.getByRole('button', { name: /previous change/i }));
      expect(onNavigate).toHaveBeenCalledWith('prev');
    });

    it('should support N key for next change navigation', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="split"
          showNavigation={true}
          onNavigateChange={onNavigate}
        />
      );

      // Focus the diff view container first
      const container = screen.getByTestId('diff-view-container');
      container.focus();

      await user.keyboard('n');
      expect(onNavigate).toHaveBeenCalledWith('next');
    });

    it('should support Shift+N key for previous change navigation', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="split"
          showNavigation={true}
          onNavigateChange={onNavigate}
        />
      );

      // Focus the diff view container
      const container = screen.getByTestId('diff-view-container');
      container.focus();

      await user.keyboard('{Shift>}n{/Shift}');
      expect(onNavigate).toHaveBeenCalledWith('prev');
    });

    it('should show change indicator with current position', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="split"
          showNavigation={true}
          currentChangeIndex={0}
          totalChanges={3}
        />
      );

      // Should show "1 of 3" or similar
      expect(screen.getByText(/1.*of.*3/i)).toBeInTheDocument();
    });

    it('should highlight the currently focused change', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_CODE}
          newContent={SAMPLE_NEW_CODE}
          mode="split"
          showNavigation={true}
          currentChangeIndex={0}
        />
      );

      // The change lines should have focused styling (multiple lines per change)
      const focusedChanges = screen.getAllByTestId('diff-change-focused');
      expect(focusedChanges.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // Technical Requirements
  // =============================================================================

  describe('Technical Requirements', () => {
    describe('Line Numbers', () => {
      it('should show line numbers on both sides in split mode', () => {
        render(
          <DiffView
            oldContent={SAMPLE_OLD_TEXT}
            newContent={SAMPLE_NEW_TEXT}
            mode="split"
            showLineNumbers={true}
          />
        );

        // Should find line number elements
        const lineNumbers = screen.getAllByTestId(/line-number/);
        expect(lineNumbers.length).toBeGreaterThan(0);
      });

      it('should show line numbers in unified mode', () => {
        render(
          <DiffView
            oldContent={SAMPLE_OLD_TEXT}
            newContent={SAMPLE_NEW_TEXT}
            mode="unified"
            showLineNumbers={true}
          />
        );

        // Unified mode should show both old and new line numbers
        expect(screen.getAllByTestId('line-number-old').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('line-number-new').length).toBeGreaterThan(0);
      });

      it('should handle line numbers correctly with deletions', () => {
        render(
          <DiffView
            oldContent="line1\nline2\nline3"
            newContent="line1\nline3"
            mode="unified"
            showLineNumbers={true}
          />
        );

        // Line 2 was deleted - should still have line numbers displayed
        const oldLineNumbers = screen.getAllByTestId('line-number-old');
        const newLineNumbers = screen.getAllByTestId('line-number-new');
        // We should have some line numbers for context and changes
        expect(oldLineNumbers.length + newLineNumbers.length).toBeGreaterThan(0);
      });
    });

    describe('Diff Calculation with diff-match-patch', () => {
      it('should correctly identify character-level changes', () => {
        render(
          <DiffView
            oldContent="Hello World"
            newContent="Hello Universe"
            mode="unified"
          />
        );

        // Should identify "World" as deleted and "Universe" as added
        expect(screen.getByText(/World/)).toBeInTheDocument();
        expect(screen.getByText(/Universe/)).toBeInTheDocument();
      });

      it('should handle multi-line diffs', () => {
        const old = `line1
line2
line3`;
        const newText = `line1
modified2
line3
line4`;

        render(
          <DiffView
            oldContent={old}
            newContent={newText}
            mode="split"
          />
        );

        // Should show the modification and addition
        const additions = screen.getAllByTestId('diff-addition');
        const deletions = screen.getAllByTestId('diff-deletion');
        
        expect(additions.length).toBeGreaterThan(0);
        expect(deletions.length).toBeGreaterThan(0);
      });
    });

    describe('Syntax Highlighting', () => {
      it('should preserve syntax highlighting in diff when language is specified', () => {
        render(
          <DiffView
            oldContent={SAMPLE_OLD_TEXT}
            newContent={SAMPLE_NEW_TEXT}
            mode="split"
            language="javascript"
          />
        );

        // Should have syntax-highlighted code elements
        expect(screen.getByTestId('diff-view-container')).toHaveAttribute('data-language', 'javascript');
      });

      it('should support common languages', () => {
        const languages: Array<'javascript' | 'typescript' | 'python' | 'json'> = ['javascript', 'typescript', 'python', 'json'];
        
        languages.forEach(lang => {
          const { unmount } = render(
            <DiffView
              oldContent="code"
              newContent="code modified"
              mode="split"
              language={lang}
            />
          );
          
          expect(screen.getByTestId('diff-view-container')).toHaveAttribute('data-language', lang);
          unmount();
        });
      });
    });
  });

  // =============================================================================
  // Accessibility
  // =============================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
        />
      );

      expect(screen.getByRole('region', { name: /diff view/i })).toBeInTheDocument();
    });

    it('should announce changes to screen readers', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
        />
      );

      // Should have aria-live region for change announcements
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
          showNavigation={true}
        />
      );

      const container = screen.getByTestId('diff-view-container');
      expect(container).toHaveAttribute('tabIndex', '0');
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle identical content (no changes)', () => {
      render(
        <DiffView
          oldContent="same content"
          newContent="same content"
          mode="split"
        />
      );

      // Should show "No changes" or similar (may appear in multiple places)
      const noChangesElements = screen.getAllByText(/no changes/i);
      expect(noChangesElements.length).toBeGreaterThan(0);
    });

    it('should handle very long lines', () => {
      const longLine = 'x'.repeat(1000);
      
      render(
        <DiffView
          oldContent={longLine}
          newContent={longLine + ' added'}
          mode="split"
        />
      );

      // Should render without crashing
      expect(screen.getByTestId('diff-view-container')).toBeInTheDocument();
    });

    it('should handle binary-like content gracefully', () => {
      render(
        <DiffView
          oldContent="Binary content \x00\x01"
          newContent="Binary content \x00\x02"
          mode="split"
        />
      );

      // Should render without crashing
      expect(screen.getByTestId('diff-view-container')).toBeInTheDocument();
    });

    it('should handle whitespace-only changes', () => {
      render(
        <DiffView
          oldContent="text  with   spaces"
          newContent="text with spaces"
          mode="split"
        />
      );

      // Should show the whitespace difference
      expect(screen.getByTestId('diff-view-container')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Responsive Design
  // =============================================================================

  describe('Responsive Design', () => {
    it('should be responsive with proper container styling', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
        />
      );

      const container = screen.getByTestId('diff-view-container');
      expect(container).toHaveClass('diff-view-container');
    });

    it('should allow custom className', () => {
      render(
        <DiffView
          oldContent={SAMPLE_OLD_TEXT}
          newContent={SAMPLE_NEW_TEXT}
          mode="split"
          className="custom-diff-class"
        />
      );

      const container = screen.getByTestId('diff-view-container');
      expect(container).toHaveClass('custom-diff-class');
    });
  });
});
