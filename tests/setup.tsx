import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  redirect: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/use-modal-store', () => ({
  useModal: () => ({
    onOpen: vi.fn(),
    onClose: vi.fn(),
    type: null,
    data: {},
    isOpen: false,
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));
