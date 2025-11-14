"use client";

import * as React from "react";
import {
  IconWifiOff,
  IconWifi,
  IconCloudUpload,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type StatusBannerProps = {
  isOnline: boolean;
  queueCount: number;
  onRetry: () => void;
  isProcessing: boolean;
};

export function StatusBanner({
  isOnline,
  queueCount,
  onRetry,
  isProcessing,
}: StatusBannerProps) {
  const hasQueue = queueCount > 0;

  if (isOnline && !hasQueue) {
    return (
      <div className="flex items-center justify-between rounded-2xl border bg-emerald-50 px-4 py-3 text-emerald-900">
        <div className="flex items-center gap-2 text-sm font-medium">
          <IconWifi className="h-4 w-4" />
          Online · Sinkronisasi normal
        </div>
        <Badge variant="outline" className="border-emerald-200 text-emerald-900">
          POS Ready
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex items-center gap-2 text-sm font-medium">
        <IconWifiOff className="h-4 w-4" />
        {isOnline
          ? `Perlu sinkronisasi - ${queueCount} order menunggu`
          : "Offline - order akan diantrikan"}
      </div>
      {hasQueue ? (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-200 text-amber-900"
          >
            <IconCloudUpload className="mr-1 h-3.5 w-3.5" />
            {queueCount} order
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-amber-200 text-amber-900"
            onClick={onRetry}
            disabled={isProcessing}
          >
            {isProcessing ? "Menyinkron..." : "Sinkron sekarang"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
