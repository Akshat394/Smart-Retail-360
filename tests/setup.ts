import '@testing-library/jest-dom';

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock IntersectionObserver
if (typeof global !== 'undefined') {
  (global as any).IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() { return []; }
    root: Element | null = null;
    rootMargin: string = '';
    thresholds: ReadonlyArray<number> = [];
  };

  // Mock ResizeObserver
  (global as any).ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };
}

// Mock WebSocket
if (typeof global !== 'undefined') {
  (global as any).WebSocket = class WebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
    
    // Required properties
    readyState: number = WebSocket.CONNECTING;
    url: string = '';
    protocol: string = '';
    extensions: string = '';
    bufferedAmount: number = 0;
    onopen: ((this: WebSocket, ev: Event) => any) | null = null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
    onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  };

  // Mock fetch
  (global as any).fetch = jest.fn();
}

// Mock console methods to reduce noise in tests
if (typeof global !== 'undefined') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
} 