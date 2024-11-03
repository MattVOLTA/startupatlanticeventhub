import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  title: string;
  message: string;
}

export function ErrorMessage({ title, message }: ErrorMessageProps) {
  return (
    <div className="rounded-lg bg-red-50 p-6 max-w-2xl mx-auto mt-8">
      <div className="flex items-center">
        <AlertCircle className="h-6 w-6 text-red-600" />
        <h3 className="ml-3 text-lg font-medium text-red-800">{title}</h3>
      </div>
      <div className="mt-3">
        <p className="text-red-700">{message}</p>
      </div>
    </div>
  );
}