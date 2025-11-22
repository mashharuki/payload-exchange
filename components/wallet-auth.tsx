"use client";

import {
  useEvmAddress,
  useIsSignedIn,
  useSolanaAddress,
} from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useEffect, useState } from "react";

function WalletAuthContent() {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const { solanaAddress } = useSolanaAddress();

  if (isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center gap-3">
            <svg
              aria-hidden="true"
              className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                clipRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                fillRule="evenodd"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-green-900 text-sm dark:text-green-100">
                Welcome! You&apos;re signed in.
              </p>
            </div>
          </div>
        </div>
        {evmAddress && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-1 text-slate-600 text-xs dark:text-slate-400">
              EVM Address:
            </p>
            <p className="break-all font-mono text-slate-900 text-sm dark:text-slate-100">
              {evmAddress}
            </p>
          </div>
        )}
        {solanaAddress && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-1 text-slate-600 text-xs dark:text-slate-400">
              Solana Address:
            </p>
            <p className="break-all font-mono text-slate-900 text-sm dark:text-slate-100">
              {solanaAddress}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
        <div className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              clipRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              fillRule="evenodd"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="mb-2 font-medium text-blue-900 text-sm dark:text-blue-100">
              Please sign in to access your embedded wallet
            </p>
            <AuthButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WalletAuth() {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  // CDP requires domain whitelisting which doesn't work in ChatGPT's dynamic sandbox domains
  // Show a message when running in iframe
  if (isInIframe) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950">
        <div className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              clipRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              fillRule="evenodd"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-yellow-900 dark:text-yellow-100">
              CDP Embedded Wallets require direct access
            </p>
            <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-200">
              CDP requires domain whitelisting which doesn&apos;t work in
              ChatGPT&apos;s sandbox environment. Please access this app
              directly at your deployed URL to use embedded wallets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <WalletAuthContent />;
}
