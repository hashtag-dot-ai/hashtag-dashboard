import * as Dialog from '@radix-ui/react-dialog';
import { Link, X } from 'lucide-react';
import CopyButton from './CopyButton';

interface Props {
  rawToken: string;
  onClose: () => void;
}

export default function InviteLinkModal({ rawToken, onClose }: Props) {
  const inviteUrl = `${window.location.origin}/accept-invite?token=${encodeURIComponent(rawToken)}`;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Link size={18} className="text-indigo-600" />
                Invite link created
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Share this link with anyone you want to join the project. The same link can be used
              multiple times. Revoke it from the Members tab when you no longer want it to work.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Invite URL
                </label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <code className="flex-1 text-xs font-mono text-gray-800 break-all select-all">
                    {inviteUrl}
                  </code>
                  <CopyButton value={inviteUrl} className="shrink-0" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Raw token
                </label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <code className="flex-1 text-xs font-mono text-gray-600 break-all select-all">
                    {rawToken}
                  </code>
                  <CopyButton value={rawToken} className="shrink-0" />
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
