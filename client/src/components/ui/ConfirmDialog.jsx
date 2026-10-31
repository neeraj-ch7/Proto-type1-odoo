import React from 'react';
import Modal from './Modal';
import Button from './Button';

/**
 * Editorial ConfirmDialog
 */
export default function ConfirmDialog({
  open,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <p className="text-xs text-ink uppercase tracking-wide leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3 pt-3 border-t border-ink">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
