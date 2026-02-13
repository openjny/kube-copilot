import React, { createContext, useContext, useCallback, useRef, useState } from "react";

export interface PendingConfirmation {
  command: string;
  isDestructive: boolean;
  resolve: (approved: boolean) => void;
}

interface ConfirmationContextValue {
  pending: PendingConfirmation | null;
  requestConfirmation: (
    command: string,
    isDestructive: boolean
  ) => Promise<boolean>;
  respond: (approved: boolean) => void;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function useConfirmation(): ConfirmationContextValue {
  const ctx = useContext(ConfirmationContext);
  if (!ctx) {
    throw new Error(
      "useConfirmation must be used within a ConfirmationProvider"
    );
  }
  return ctx;
}

// Singleton for tool handlers to call without React context access
let globalRequestConfirmation:
  | ((command: string, isDestructive: boolean) => Promise<boolean>)
  | null = null;

export function getRequestConfirmation(): (
  command: string,
  isDestructive: boolean
) => Promise<boolean> {
  if (!globalRequestConfirmation) {
    throw new Error("ConfirmationProvider not mounted yet");
  }
  return globalRequestConfirmation;
}

export function ConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const resolveRef = useRef<((approved: boolean) => void) | null>(null);

  const requestConfirmation = useCallback(
    (command: string, isDestructive: boolean): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setPending({ command, isDestructive, resolve });
      });
    },
    []
  );

  const respond = useCallback((approved: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(approved);
      resolveRef.current = null;
      setPending(null);
    }
  }, []);

  // Expose to global singleton for tool handlers
  globalRequestConfirmation = requestConfirmation;

  return React.createElement(
    ConfirmationContext.Provider,
    { value: { pending, requestConfirmation, respond } },
    children
  );
}
