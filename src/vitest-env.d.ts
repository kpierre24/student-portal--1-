/// <reference types="vitest" />

declare module 'vitest' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export const expect: any;
  export const vi: any;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export const waitFor: (callback: () => void | Promise<void>, options?: { timeout?: number }) => Promise<void>;
}

declare module '@testing-library/react' {
  export const waitFor: (callback: () => void | Promise<void>, options?: { timeout?: number }) => Promise<void>;
  export function render(ui: React.ReactElement, options?: unknown): {
    container: HTMLElement;
    baseElement: HTMLElement;
    debug(ui?: HTMLElement | string): void;
    rerender(ui: React.ReactElement): void;
    unmount(): void;
    findByText(text: string | RegExp, options?: unknown): Promise<HTMLElement>;
    findByLabelText(text: string | RegExp, options?: unknown): Promise<HTMLElement>;
    getByText(text: string | RegExp, options?: unknown): HTMLElement;
    getAllByText(text: string | RegExp, options?: unknown): HTMLElement[];
    getByLabelText(text: string | RegExp, options?: unknown): HTMLElement;
    getByPlaceholderText(text: string | RegExp, options?: unknown): HTMLElement;
    getByTitle(text: string | RegExp, options?: unknown): HTMLElement;
    queryByText(text: string | RegExp, options?: unknown): HTMLElement | null;
    queryByLabelText(text: string | RegExp, options?: unknown): HTMLElement | null;
    queryByTitle(text: string | RegExp, options?: unknown): HTMLElement | null;
  };
  export function renderHook<T>(hook: () => T, options?: unknown): {
    result: { current: T };
    rerender(props?: unknown): void;
    unmount(): void;
  };
  export const screen: {
    getByText(text: string | RegExp, options?: unknown): HTMLElement;
    getAllByText(text: string | RegExp, options?: unknown): HTMLElement[];
    getByLabelText(text: string | RegExp, options?: unknown): HTMLElement;
    getByPlaceholderText(text: string | RegExp, options?: unknown): HTMLElement;
    getByTitle(text: string | RegExp, options?: unknown): HTMLElement;
    queryByText(text: string | RegExp, options?: unknown): HTMLElement | null;
    queryByLabelText(text: string | RegExp, options?: unknown): HTMLElement | null;
    queryByTitle(text: string | RegExp, options?: unknown): HTMLElement | null;
    findByText(text: string | RegExp, options?: unknown): Promise<HTMLElement>;
    findByLabelText(text: string | RegExp, options?: unknown): Promise<HTMLElement>;
  };
  export const fireEvent: {
    click(element: HTMLElement | Element): void;
    change(element: HTMLElement | Element, options?: any): void;
    [key: string]: any;
  };
  export function act(fn: () => void | Promise<void>): Promise<void>;
}
