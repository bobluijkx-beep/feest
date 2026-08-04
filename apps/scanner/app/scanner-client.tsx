"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Card } from "@lions/ui";
import { submitScan, flushQueue, getQueueCount, type CheckinResult } from "@/lib/offline-queue";

type Feedback = { kind: "ok" | "warn" | "error"; message: string; detail?: string } | null;

function playTone(frequency: number, durationMs: number) {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      void ctx.close();
    }, durationMs);
  } catch {
    // geluid is een bonus, geen kritiek pad — camera-feedback blijft zichtbaar werken
  }
}

function describeResult(result: CheckinResult): Feedback {
  switch (result.status) {
    case "ok":
      return {
        kind: "ok",
        message: "Toegang verleend",
        detail: result.ticket ? `${result.ticket.buyerName} — ${result.ticket.ticketTypeName}` : undefined,
      };
    case "already_checked_in":
      return {
        kind: "warn",
        message: "Al ingecheckt",
        detail: result.ticket ? `${result.ticket.buyerName} — ${result.ticket.ticketTypeName}` : undefined,
      };
    case "cancelled":
      return { kind: "error", message: "Ticket geannuleerd" };
    case "no_access":
      return { kind: "error", message: "Geen toegang tot dit evenement" };
    case "queued":
      return { kind: "warn", message: "Offline — scan opgeslagen" };
    case "invalid":
    default:
      return { kind: "error", message: "Ongeldig ticket" };
  }
}

export function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);
  const sessionSeenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  async function handleDecoded(qrToken: string) {
    if (busyRef.current) return;
    const now = Date.now();
    if (lastTokenRef.current?.token === qrToken && now - lastTokenRef.current.at < 3000) return;
    lastTokenRef.current = { token: qrToken, at: now };
    busyRef.current = true;

    try {
      // Lokale sessie-cache geeft direct een "al gescand"-signaal, nog vóór het
      // serverantwoord binnen is — de server blijft bij het uiteindelijke resultaat
      // altijd leidend (zie describeResult hieronder).
      const wasSeenLocally = sessionSeenRef.current.has(qrToken);
      if (wasSeenLocally) {
        setFeedback({ kind: "warn", message: "Al gescand (deze sessie)…" });
      }

      const device = navigator.userAgent.slice(0, 80);
      const result = await submitScan(qrToken, device);

      if (result.status === "ok" || result.status === "already_checked_in") {
        sessionSeenRef.current.add(qrToken);
      }
      if (result.status === "queued") {
        setPendingCount(await getQueueCount());
      }

      const described = describeResult(result);
      setFeedback(described);
      if (described?.kind === "ok") playTone(880, 150);
      else if (described?.kind === "warn") playTone(440, 200);
      else playTone(200, 300);
    } finally {
      busyRef.current = false;
    }
  }

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(videoRef.current, (result) => void handleDecoded(result.data), {
      highlightScanRegion: true,
      highlightCodeOutline: true,
    });

    scanner.start().catch((err) => setFeedback({ kind: "error", message: "Camera niet beschikbaar", detail: String(err) }));

    return () => {
      scanner.stop();
      scanner.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    getQueueCount().then(setPendingCount);

    async function trySync() {
      await flushQueue();
      setPendingCount(await getQueueCount());
    }

    window.addEventListener("online", trySync);
    const interval = setInterval(trySync, 15000);
    return () => {
      window.removeEventListener("online", trySync);
      clearInterval(interval);
    };
  }, []);

  const feedbackClasses =
    feedback?.kind === "ok"
      ? "border-primary text-primary bg-primary/5"
      : feedback?.kind === "warn"
        ? "border-amber-500 text-amber-600 bg-amber-500/5"
        : feedback?.kind === "error"
          ? "border-destructive text-destructive bg-destructive/5"
          : "border-border text-muted-foreground";

  return (
    <div className="flex flex-col gap-3">
      {!isOnline && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Offline — scans worden lokaal opgeslagen en later gesynchroniseerd.
        </p>
      )}
      {pendingCount > 0 && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
          {pendingCount} scan(s) wachten op synchronisatie.
        </p>
      )}

      <Card className="p-0">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="w-full rounded-xl" muted playsInline />
      </Card>

      <div className={`min-h-20 rounded-xl border-2 p-4 text-center ${feedbackClasses}`}>
        {feedback ? (
          <>
            <div className="text-xl font-bold">{feedback.message}</div>
            {feedback.detail && <div className="text-sm">{feedback.detail}</div>}
          </>
        ) : (
          <div className="text-sm">Richt de camera op een ticket-QR-code.</div>
        )}
      </div>
    </div>
  );
}
