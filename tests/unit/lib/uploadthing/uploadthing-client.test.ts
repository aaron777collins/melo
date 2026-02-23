import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFiles } from 'uploadthing/client';
import { createUploadthingClient, FileValidationError, UploadConfig } from '@/lib/uploadthing/client';

// Mock uploadthing/client
vi.mock('uploadthing/client', () => ({
  uploadFiles: vi.fn()
}));

const mockUploadFiles = vi.mocked(uploadFiles);

describe('UploadThing Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUploadthingClient', () => {
    it('should create client with default configuration', () => {
      const client = createUploadthingClient();
      expect(client).toBeDefined();
      expect(client.uploadMessageFiles).toBeDefined();
      expect(client.uploadServerImage).toBeDefined();
    });

    it('should create client with custom configuration', () => {
      const config: UploadConfig = {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['image/jpeg', 'image/png'],
        enableValidation: true
      };
      
      const client = createUploadthingClient(config);
      expect(client).toBeDefined();
    });
  });

  describe('File Validation', () => {
    it('should validate file types when enabled', async () => {
      const config: UploadConfig = {
        allowedFileTypes: ['image/jpeg', 'image/png'],
        enableValidation: true
      };
      
      const client = createUploadthingClient(config);
      
      // Create a mock file with invalid type
      const invalidFile = new File(['content'], 'test.txt', {
        type: 'text/plain'
      });
      
      await expect(client.uploadMessageFiles([invalidFile])).rejects.toThrow(FileValidationError);
      await expect(client.uploadMessageFiles([invalidFile])).rejects.toThrow('File type not allowed');
    });

    it('should validate file size when enabled', async () => {
      const config: UploadConfig = {
        maxFileSize: 1024, // 1KB
        enableValidation: true
      };
      
      const client = createUploadthingClient(config);
      
      // Create a mock large file
      const largeContent = 'x'.repeat(2048); // 2KB
      const largeFile = new File([largeContent], 'large.txt', {
        type: 'text/plain'
      });
      
      await expect(client.uploadMessageFiles([largeFile])).rejects.toThrow(FileValidationError);
      await expect(client.uploadMessageFiles([largeFile])).rejects.toThrow('File size exceeds limit');
    });

    it('should allow valid files when validation enabled', async () => {
      const config: UploadConfig = {
        allowedFileTypes: ['image/jpeg'],
        maxFileSize: 1024 * 1024, // 1MB
        enableValidation: true
      };
      
      const client = createUploadthingClient(config);
      
      const validFile = new File(['content'], 'image.jpg', {
        type: 'image/jpeg'
      });
      
      mockUploadFiles.mockResolvedValue([
        {
          name: 'image.jpg',
          size: 1024,
          key: 'test-key',
          url: 'https://utfs.io/f/test-key'
        }
      ]);
      
      const result = await client.uploadMessageFiles([validFile]);
      
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://utfs.io/f/test-key');
      expect(mockUploadFiles).toHaveBeenCalledWith(
        'messageFile',
        {
          files: [validFile],
          onUploadProgress: expect.any(Function)
        }
      );
    });

    it('should skip validation when disabled', async () => {
      const config: UploadConfig = {
        enableValidation: false
      };
      
      const client = createUploadthingClient(config);
      
      const file = new File(['content'], 'any-file.xyz', {
        type: 'application/unknown'
      });
      
      mockUploadFiles.mockResolvedValue([
        {
          name: 'any-file.xyz',
          size: 1024,
          key: 'test-key',
          url: 'https://utfs.io/f/test-key'
        }
      ]);
      
      const result = await client.uploadMessageFiles([file]);
      
      expect(result).toHaveLength(1);
      expect(mockUploadFiles).toHaveBeenCalled();
    });
  });

  describe('Upload Message Files', () => {
    it('should upload files successfully', async () => {
      const client = createUploadthingClient();
      
      const files = [
        new File(['content1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'file2.png', { type: 'image/png' })
      ];
      
      mockUploadFiles.mockResolvedValue([
        {
          name: 'file1.jpg',
          size: 1024,
          key: 'key1',
          url: 'https://utfs.io/f/key1'
        },
        {
          name: 'file2.png',
          size: 2048,
          key: 'key2',
          url: 'https://utfs.io/f/key2'
        }
      ]);
      
      const result = await client.uploadMessageFiles(files);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('file1.jpg');
      expect(result[1].name).toBe('file2.png');
    });

    it('should handle upload progress callback', async () => {
      const client = createUploadthingClient();
      const progressCallback = vi.fn();
      
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      
      mockUploadFiles.mockImplementation((endpoint, options) => {
        // Simulate progress callback
        if (options?.onUploadProgress) {
          options.onUploadProgress({ 
            file: file.name, 
            progress: 50 
          });
          options.onUploadProgress({ 
            file: file.name, 
            progress: 100 
          });
        }
        
        return Promise.resolve([
          {
            name: 'test.jpg',
            size: 1024,
            key: 'test-key',
            url: 'https://utfs.io/f/test-key'
          }
        ]);
      });
      
      await client.uploadMessageFiles([file], { onProgress: progressCallback });
      
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 50 })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 100 })
      );
    });

    it('should handle upload errors', async () => {
      const client = createUploadthingClient();
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      
      mockUploadFiles.mockRejectedValue(new Error('Upload failed'));
      
      await expect(client.uploadMessageFiles([file])).rejects.toThrow('Upload failed');
    });
  });

  describe('Upload Server Image', () => {
    it('should upload server image successfully', async () => {
      const client = createUploadthingClient();
      
      const file = new File(['content'], 'server-icon.png', { type: 'image/png' });
      
      mockUploadFiles.mockResolvedValue([
        {
          name: 'server-icon.png',
          size: 1024,
          key: 'server-key',
          url: 'https://utfs.io/f/server-key'
        }
      ]);
      
      const result = await client.uploadServerImage(file);
      
      expect(result.name).toBe('server-icon.png');
      expect(result.url).toBe('https://utfs.io/f/server-key');
      expect(mockUploadFiles).toHaveBeenCalledWith(
        'serverImage',
        expect.objectContaining({
          files: [file]
        })
      );
    });

    it('should validate single file for server image', async () => {
      const config: UploadConfig = {
        enableValidation: true
      };
      
      const client = createUploadthingClient(config);
      
      const files = [
        new File(['content1'], 'file1.png', { type: 'image/png' }),
        new File(['content2'], 'file2.png', { type: 'image/png' })
      ];
      
      await expect(client.uploadServerImage(files as any)).rejects.toThrow('Server image upload requires exactly one file');
    });
  });

  describe('Error Handling', () => {
    it('should throw FileValidationError with proper message', () => {
      const error = new FileValidationError('Test validation error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('FileValidationError');
      expect(error.message).toBe('Test validation error');
    });
  });
});