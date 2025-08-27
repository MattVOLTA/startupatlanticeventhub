import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  organizationName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ organizationName, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-ocean/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-sky/20 w-96 shadow-lg rounded-lg bg-white">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-rock mr-2" />
          <h3 className="text-lg font-display font-bold text-ocean">Confirm Delete</h3>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to delete <strong>{organizationName}</strong>? This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-ocean bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-netting"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-rock border border-transparent rounded-md hover:bg-rock/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rock"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}