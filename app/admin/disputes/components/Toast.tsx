'use client';

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
      {message}
    </div>
  );
}
