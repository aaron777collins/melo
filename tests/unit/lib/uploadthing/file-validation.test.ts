import { describe, it, expect } from 'vitest';
import { 
  validateFileType, 
  validateFileSize, 
  validateFileName, 
  validateFiles, 
  FileValidationError,
  DEFAULT_ALLOWED_TYPES,
  DEFAULT_MAX_FILE_SIZE,
  ValidationConfig 
} from '@/lib/uploadthing/file-validation';

describe('File Validation', () => {
  describe('validateFileType', () => {
    it('should accept allowed file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
      const jpegFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File(['content'], 'test.png', { type: 'image/png' });
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      expect(() => validateFileType(jpegFile, allowedTypes)).not.toThrow();
      expect(() => validateFileType(pngFile, allowedTypes)).not.toThrow();
      expect(() => validateFileType(pdfFile, allowedTypes)).not.toThrow();
    });

    it('should reject disallowed file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png'];
      
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const exeFile = new File(['content'], 'test.exe', { type: 'application/octet-stream' });
      
      expect(() => validateFileType(txtFile, allowedTypes)).toThrow(FileValidationError);
      expect(() => validateFileType(exeFile, allowedTypes)).toThrow(FileValidationError);
      expect(() => validateFileType(txtFile, allowedTypes)).toThrow('File type not allowed: text/plain');
    });

    it('should use default allowed types when none provided', () => {
      const imageFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const videoFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      
      expect(() => validateFileType(imageFile)).not.toThrow();
      expect(() => validateFileType(videoFile)).not.toThrow();
    });

    it('should reject files with empty or invalid mime types', () => {
      const fileWithoutType = new File(['content'], 'test', { type: '' });
      const allowedTypes = ['image/jpeg'];
      
      expect(() => validateFileType(fileWithoutType, allowedTypes)).toThrow(FileValidationError);
      expect(() => validateFileType(fileWithoutType, allowedTypes)).toThrow('File type not allowed: ');
    });

    it('should handle case-insensitive file type matching', () => {
      const allowedTypes = ['IMAGE/JPEG', 'IMAGE/PNG'];
      const jpegFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      
      expect(() => validateFileType(jpegFile, allowedTypes)).not.toThrow();
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const maxSize = 1024 * 1024; // 1MB
      const smallFile = new File(['x'.repeat(1024)], 'small.txt', { type: 'text/plain' });
      
      expect(() => validateFileSize(smallFile, maxSize)).not.toThrow();
    });

    it('should reject files exceeding size limit', () => {
      const maxSize = 1024; // 1KB
      const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
      
      expect(() => validateFileSize(largeFile, maxSize)).toThrow(FileValidationError);
      expect(() => validateFileSize(largeFile, maxSize)).toThrow('File size exceeds limit');
    });

    it('should use default max size when none provided', () => {
      const smallFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      expect(() => validateFileSize(smallFile)).not.toThrow();
    });

    it('should handle zero-sized files', () => {
      const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
      const maxSize = 1024;
      
      expect(() => validateFileSize(emptyFile, maxSize)).not.toThrow();
    });

    it('should format file size in error message', () => {
      const maxSize = 1024; // 1KB
      const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
      
      expect(() => validateFileSize(largeFile, maxSize)).toThrow(/2\.0 KB.*1\.0 KB/);
    });
  });

  describe('validateFileName', () => {
    it('should accept valid file names', () => {
      const validNames = [
        'document.pdf',
        'image_file.jpg',
        'my-photo.png',
        'Video 2024.mp4',
        'file.with.dots.txt'
      ];
      
      validNames.forEach(name => {
        const file = new File(['content'], name, { type: 'text/plain' });
        expect(() => validateFileName(file)).not.toThrow();
      });
    });

    it('should reject files with dangerous names', () => {
      const dangerousNames = [
        'script.js',
        'malware.exe',
        'virus.bat',
        'shell.sh',
        'payload.ps1',
        '.htaccess',
        'config.php'
      ];
      
      dangerousNames.forEach(name => {
        const file = new File(['content'], name, { type: 'text/plain' });
        expect(() => validateFileName(file)).toThrow(FileValidationError);
        expect(() => validateFileName(file)).toThrow('File name not allowed');
      });
    });

    it('should reject files with path traversal attempts', () => {
      const pathTraversalNames = [
        '../../../etc/passwd',
        '../file.txt',
        'folder/../file.txt',
        '..\\file.txt',
        'subfolder\\..\\file.txt'
      ];
      
      pathTraversalNames.forEach(name => {
        const file = new File(['content'], name, { type: 'text/plain' });
        expect(() => validateFileName(file)).toThrow(FileValidationError);
        expect(() => validateFileName(file)).toThrow('File name contains invalid characters');
      });
    });

    it('should reject files with extremely long names', () => {
      const longName = 'a'.repeat(256) + '.txt';
      const file = new File(['content'], longName, { type: 'text/plain' });
      
      expect(() => validateFileName(file)).toThrow(FileValidationError);
      expect(() => validateFileName(file)).toThrow('File name too long');
    });

    it('should reject files with empty or whitespace-only names', () => {
      const invalidNames = ['', '   ', '\t', '\n'];
      
      invalidNames.forEach(name => {
        const file = new File(['content'], name, { type: 'text/plain' });
        expect(() => validateFileName(file)).toThrow(FileValidationError);
        expect(() => validateFileName(file)).toThrow('File name cannot be empty');
      });
    });
  });

  describe('validateFiles', () => {
    const config: ValidationConfig = {
      allowedTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 1024 * 1024, // 1MB
      maxFileCount: 3
    };

    it('should validate multiple files successfully', () => {
      const files = [
        new File(['content1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'image2.png', { type: 'image/png' })
      ];
      
      expect(() => validateFiles(files, config)).not.toThrow();
    });

    it('should reject when too many files', () => {
      const files = [
        new File(['content1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'image2.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'image3.jpg', { type: 'image/jpeg' }),
        new File(['content4'], 'image4.jpg', { type: 'image/jpeg' })
      ];
      
      expect(() => validateFiles(files, config)).toThrow(FileValidationError);
      expect(() => validateFiles(files, config)).toThrow('Too many files. Maximum allowed: 3');
    });

    it('should reject empty file list', () => {
      expect(() => validateFiles([], config)).toThrow(FileValidationError);
      expect(() => validateFiles([], config)).toThrow('No files provided');
    });

    it('should validate each file individually', () => {
      const files = [
        new File(['content1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['x'.repeat(2048 * 1024)], 'large.jpg', { type: 'image/jpeg' }) // Too large
      ];
      
      expect(() => validateFiles(files, config)).toThrow(FileValidationError);
      expect(() => validateFiles(files, config)).toThrow('File size exceeds limit');
    });

    it('should use default validation config when none provided', () => {
      const files = [
        new File(['content'], 'image.jpg', { type: 'image/jpeg' })
      ];
      
      expect(() => validateFiles(files)).not.toThrow();
    });
  });

  describe('Security Tests', () => {
    it('should prevent executable file uploads', () => {
      const executableTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-msdos-program',
        'application/octet-stream'
      ];
      
      executableTypes.forEach(type => {
        const file = new File(['content'], 'malware.exe', { type });
        expect(() => validateFileType(file, DEFAULT_ALLOWED_TYPES)).toThrow(FileValidationError);
      });
    });

    it('should prevent script file uploads', () => {
      const scriptTypes = [
        'application/javascript',
        'text/javascript',
        'application/x-php',
        'text/x-python',
        'application/x-sh'
      ];
      
      scriptTypes.forEach(type => {
        const file = new File(['content'], 'script.js', { type });
        expect(() => validateFileType(file, DEFAULT_ALLOWED_TYPES)).toThrow(FileValidationError);
      });
    });

    it('should limit total upload size', () => {
      const files = [
        new File(['x'.repeat(3 * 1024 * 1024)], 'large1.jpg', { type: 'image/jpeg' }), // 3MB
        new File(['x'.repeat(3 * 1024 * 1024)], 'large2.jpg', { type: 'image/jpeg' })  // 3MB
      ];
      
      const config: ValidationConfig = {
        maxTotalSize: 5 * 1024 * 1024 // 5MB total limit
      };
      
      expect(() => validateFiles(files, config)).toThrow(FileValidationError);
      expect(() => validateFiles(files, config)).toThrow('Total file size exceeds limit');
    });
  });

  describe('Constants', () => {
    it('should have proper default allowed types', () => {
      expect(DEFAULT_ALLOWED_TYPES).toContain('image/jpeg');
      expect(DEFAULT_ALLOWED_TYPES).toContain('image/png');
      expect(DEFAULT_ALLOWED_TYPES).toContain('application/pdf');
      expect(DEFAULT_ALLOWED_TYPES).not.toContain('application/javascript');
      expect(DEFAULT_ALLOWED_TYPES).not.toContain('application/x-executable');
    });

    it('should have reasonable default max file size', () => {
      expect(DEFAULT_MAX_FILE_SIZE).toBe(4 * 1024 * 1024); // 4MB
    });
  });
});