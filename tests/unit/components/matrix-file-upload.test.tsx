/**
 * Unit Tests for MatrixFileUpload Component
 * 
 * Tests the Matrix-specific file upload component functionality
 * including file validation, upload handling, and UI states.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { MatrixFileUpload } from '@/components/matrix-file-upload';

// Mock the Matrix auth provider
const mockUseMatrixAuth = vi.fn();
vi.mock('@/components/providers/matrix-auth-provider', () => ({
  useMatrixAuth: () => mockUseMatrixAuth(),
}));

// Mock the Matrix media utilities
const mockUploadMedia = vi.fn();
const mockMxcToHttpUrl = vi.fn();
const mockValidateImageFile = vi.fn();
const mockValidateFile = vi.fn();

vi.mock('@/lib/matrix/media', () => ({
  uploadMedia: (...args: any[]) => mockUploadMedia(...args),
  mxcToHttpUrl: (...args: any[]) => mockMxcToHttpUrl(...args),
  validateImageFile: (...args: any[]) => mockValidateImageFile(...args),
  validateFile: (...args: any[]) => mockValidateFile(...args),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MediaUploadError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'MediaUploadError';
    }
  },
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

describe('MatrixFileUpload', () => {
  const mockOnUpload = vi.fn();
  const mockOnError = vi.fn();
  const mockOnClear = vi.fn();

  const mockSession = {
    accessToken: 'test-token',
    homeserverUrl: 'https://matrix.example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMatrixAuth.mockReturnValue({ session: mockSession });
    mockValidateImageFile.mockReturnValue({ valid: true });
    mockValidateFile.mockReturnValue({ valid: true });
    mockMxcToHttpUrl.mockReturnValue('https://matrix.example.com/_matrix/media/r0/download/server/media123');
  });

  describe('Upload Dropzone (no value)', () => {
    it('renders upload dropzone for images', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      expect(screen.getByText('Choose files or drag and drop')).toBeInTheDocument();
      expect(screen.getByText('Image (4MB)')).toBeInTheDocument();
    });

    it('renders upload dropzone for files', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="file"
        />
      );

      expect(screen.getByText('Choose files or drag and drop')).toBeInTheDocument();
      expect(screen.getByText('Max 100MB')).toBeInTheDocument();
    });

    it('shows custom placeholder text', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          placeholder="Upload your avatar"
        />
      );

      expect(screen.getByText('Upload your avatar')).toBeInTheDocument();
    });

    it('accepts custom max size', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="file"
          maxSize={50 * 1024 * 1024} // 50MB
        />
      );

      expect(screen.getByText('Max 50MB')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          disabled={true}
        />
      );

      const container = screen.getByText('Choose files or drag and drop').closest('div');
      expect(container).toHaveClass('opacity-50');
      expect(container).toHaveClass('cursor-not-allowed');
    });
  });

  describe('File Input Handling', () => {
    it('handles file selection', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      mockUploadMedia.mockResolvedValue({ contentUri: 'mxc://server/media123' });

      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      const input = screen.getByRole('button', { hidden: true });
      const fileInput = input.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockValidateImageFile).toHaveBeenCalledWith(file, 4 * 1024 * 1024);
        expect(mockUploadMedia).toHaveBeenCalledWith(file, 'test-token', 'https://matrix.example.com');
        expect(mockOnUpload).toHaveBeenCalledWith('mxc://server/media123', file);
      });
    });

    it('handles file validation errors', async () => {
      mockValidateImageFile.mockReturnValue({ 
        valid: false, 
        error: 'File too large' 
      });

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          onError={mockOnError}
          type="image"
        />
      );

      const input = screen.getByRole('button', { hidden: true });
      const fileInput = input.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(mockOnError).toHaveBeenCalledWith('File too large');
      expect(mockUploadMedia).not.toHaveBeenCalled();
    });

    it('handles upload errors', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      mockUploadMedia.mockRejectedValue(new Error('Network error'));

      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          onError={mockOnError}
          type="image"
        />
      );

      const input = screen.getByRole('button', { hidden: true });
      const fileInput = input.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error');
      });
    });

    it('handles unauthenticated state', async () => {
      mockUseMatrixAuth.mockReturnValue({ session: null });

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          onError={mockOnError}
          type="image"
        />
      );

      const input = screen.getByRole('button', { hidden: true });
      const fileInput = input.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(mockOnError).toHaveBeenCalledWith('Not authenticated. Please sign in.');
      expect(mockUploadMedia).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag enter/leave states', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      const dropzone = screen.getByText('Choose files or drag and drop').closest('div');

      // Drag enter
      fireEvent.dragEnter(dropzone as Element);
      expect(dropzone).toHaveClass('border-indigo-500');
      expect(dropzone).toHaveClass('bg-indigo-50');

      // Drag leave
      fireEvent.dragLeave(dropzone as Element);
      expect(dropzone).not.toHaveClass('border-indigo-500');
      expect(dropzone).not.toHaveClass('bg-indigo-50');
    });

    it('handles file drop', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      mockUploadMedia.mockResolvedValue({ contentUri: 'mxc://server/media123' });

      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      const dropzone = screen.getByText('Choose files or drag and drop').closest('div');

      await act(async () => {
        fireEvent.drop(dropzone as Element, {
          dataTransfer: { files: [file] }
        });
      });

      await waitFor(() => {
        expect(mockUploadMedia).toHaveBeenCalledWith(file, 'test-token', 'https://matrix.example.com');
        expect(mockOnUpload).toHaveBeenCalledWith('mxc://server/media123', file);
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state during upload', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Make upload promise that we can control
      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });
      mockUploadMedia.mockReturnValue(uploadPromise);

      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      const input = screen.getByRole('button', { hidden: true });
      const fileInput = input.querySelector('input[type="file"]') as HTMLInputElement;

      // Start upload
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      // Should show loading state
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loader2 with animate-spin

      // Complete upload
      await act(async () => {
        resolveUpload!({ contentUri: 'mxc://server/media123' });
      });

      await waitFor(() => {
        expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Uploaded File Display', () => {
    it('displays uploaded image', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          onClear={mockOnClear}
          value="mxc://server/media123"
          type="image"
        />
      );

      const image = screen.getByAltText('Uploaded image');
      expect(image).toHaveAttribute('src', 'https://matrix.example.com/_matrix/media/r0/download/server/media123');
      expect(screen.getByRole('button')).toBeInTheDocument(); // Clear button
    });

    it('displays uploaded file', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          onClear={mockOnClear}
          value="mxc://server/document.pdf"
          type="file"
        />
      );

      expect(screen.getByText('mxc://server/document.pdf')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument(); // Clear button
    });

    it('handles clear action', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          onClear={mockOnClear}
          value="mxc://server/media123"
          type="image"
        />
      );

      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);

      expect(mockOnClear).toHaveBeenCalled();
    });

    it('disables clear button when disabled', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          onClear={mockOnClear}
          value="mxc://server/media123"
          type="image"
          disabled={true}
        />
      );

      const clearButton = screen.getByRole('button');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('File Type Validation', () => {
    it('validates image files correctly', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      const input = screen.getByRole('button', { hidden: true });
      const fileInput = input.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(mockValidateImageFile).toHaveBeenCalledWith(file, 4 * 1024 * 1024);
      expect(mockValidateFile).not.toHaveBeenCalled();
    });

    it('validates general files correctly', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="file"
        />
      );

      const input = screen.getByRole('button', { hidden: true });
      const fileInput = input.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(mockValidateFile).toHaveBeenCalledWith(file, { maxSize: 100 * 1024 * 1024 });
      expect(mockValidateImageFile).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      const fileInput = screen.getByRole('button', { hidden: true }).querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    });

    it('supports keyboard interaction', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          type="image"
        />
      );

      const dropzone = screen.getByText('Choose files or drag and drop').closest('div');
      expect(dropzone).toHaveClass('cursor-pointer');
      
      // Click should trigger file input
      const fileInput = screen.getByRole('button', { hidden: true }).querySelector('input[type="file"]');
      const clickSpy = vi.spyOn(fileInput as HTMLInputElement, 'click');
      
      fireEvent.click(dropzone as Element);
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(
        <MatrixFileUpload 
          onUpload={mockOnUpload}
          className="custom-upload"
        />
      );

      const dropzone = screen.getByText('Choose files or drag and drop').closest('div');
      expect(dropzone).toHaveClass('custom-upload');
    });
  });
});