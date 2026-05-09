import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import CopyButton from './CopyButton';
import type { KeyCreated } from '@/types/api';

interface Props {
  keyData: KeyCreated;
  onClose: () => void;
}

export default function RawKeyModal({ keyData, onClose }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                API Key Created
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Copy this key now.</strong> It will not be shown again — there is no way
                to retrieve it after you close this dialog.
              </p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                API Key
              </label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <code className="flex-1 text-sm font-mono text-gray-800 break-all select-all">
                  {keyData.raw_key}
                </code>
                <CopyButton value={keyData.raw_key} className="shrink-0" />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm mb-6">
              {keyData.description && (
                <div>
                  <dt className="text-gray-500">Label</dt>
                  <dd className="font-medium">{keyData.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Prefix</dt>
                <dd className="font-mono text-xs">{keyData.key_prefix}</dd>
              </div>
            </dl>

            <button
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              I've copied the key — close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
