"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { IconChefHat, IconCheck, IconLoader2 } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import type { KdsTicketView } from "@/features/kds/types";
import { useKdsTickets, useKdsRealtime, useUpdateTicketItemMutation } from "@/features/kds/hooks";
import type { UpdateTicketItemInput } from "@/features/orders/schemas";

type KdsScreenProps = {
  initialTickets: KdsTicketView[];
};

const STATUS_LABEL: Record<UpdateTicketItemInput["status"], string> = {
  queue: "Queue",
  making: "Making",
  ready: "Ready",
  served: "Served",
};

const STATUS_ORDER: UpdateTicketItemInput["status"][] = [
  "queue",
  "making",
  "ready",
  "served",
];

const STATUS_ACCENT: Record<UpdateTicketItemInput["status"], string> = {
  queue: "border-l-4 border-primary",
  making: "border-l-4 border-yellow-500",
  ready: "border-l-4 border-green-500",
  served: "border-l-4 border-muted",
};

export function KdsScreen({ initialTickets }: KdsScreenProps) {
  const ticketsQuery = useKdsTickets({ initialData: initialTickets });
  useKdsRealtime({ enabled: true });

  const mutation = useUpdateTicketItemMutation();
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const items = useMemo(() => {
    const data = ticketsQuery.data ?? [];
    const grouped: Record<UpdateTicketItemInput["status"], Array<ReturnType<typeof mapTicketItem>>> = {
      queue: [],
      making: [],
      ready: [],
      served: [],
    };
    for (const ticket of data) {
      for (const item of ticket.items) {
        const mapped = mapTicketItem(ticket, item);
        grouped[item.status].push(mapped);
      }
    }
    return grouped;
  }, [ticketsQuery.data]);

  const handleStatusChange = async (
    ticketId: string,
    orderItemId: string,
    status: UpdateTicketItemInput["status"],
  ) => {
    setPendingItemId(orderItemId);
    try {
      await mutation.mutateAsync({ ticketId, input: { orderItemId, status } });
      toast.success("Status tiket diperbarui");
    } catch (error) {
      console.error("[KDS_UPDATE_ERROR]", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memperbarui item",
      );
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <IconChefHat className="h-6 w-6" />
          Kitchen Display
        </h1>
        <Badge variant="secondary">
          {ticketsQuery.data?.length ?? 0} tiket aktif
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <Card key={status} className="flex h-full flex-col">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center justify-between text-base font-semibold">
                {STATUS_LABEL[status]}
                <Badge variant="outline">{items[status].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 overflow-y-auto pr-2">
              {items[status].length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada item</p>
              ) : (
                items[status].map((entry) => (
                  <div
                    key={entry.orderItemId}
                    className={`rounded-lg border p-3 ${STATUS_ACCENT[status]} bg-background`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {entry.menuName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.orderNumber} · Qty {entry.qty}
                        </p>
                        {entry.variantLabel ? (
                          <p className="text-xs text-muted-foreground">{entry.variantLabel}</p>
                        ) : null}
                      </div>
                      <Badge variant="outline">{STATUS_LABEL[status]}</Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <Select
                        value={status}
                        onValueChange={(value) =>
                          handleStatusChange(
                            entry.ticketId,
                            entry.orderItemId,
                            value as UpdateTicketItemInput["status"],
                          )
                        }
                        disabled={pendingItemId === entry.orderItemId}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((option) => (
                            <SelectItem key={option} value={option}>
                              {STATUS_LABEL[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleStatusChange(
                            entry.ticketId,
                            entry.orderItemId,
                            nextStatus(status),
                          )
                        }
                        disabled={pendingItemId === entry.orderItemId || status === "served"}
                      >
                        {pendingItemId === entry.orderItemId ? (
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1 text-xs">
                            <IconCheck className="h-4 w-4" />
                            {status === "served" ? "Selesai" : "Step Berikut"}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function mapTicketItem(ticket: KdsTicketView, item: KdsTicketView["items"][number]) {
  return {
    ticketId: ticket.id,
    orderItemId: item.orderItemId,
    orderNumber: ticket.orderNumber,
    menuName: item.menuName ?? "Menu",
    variantLabel: item.variantLabel ?? null,
    qty: item.qty,
    status: item.status,
  };
}

function nextStatus(status: UpdateTicketItemInput["status"]) {
  const index = STATUS_ORDER.indexOf(status);
  if (index === -1 || index === STATUS_ORDER.length - 1) {
    return "served" as const;
  }
  return STATUS_ORDER[index + 1];
}
