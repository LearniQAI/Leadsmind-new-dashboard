"use client";

import React from "react";
import { AudioPlayerProvider } from "./AudioPlayerProvider";
import MiniAudioPlayerBar from "./MiniAudioPlayerBar";

// Thin client wrapper so the server-component student layout can mount the player context
// above the route level without itself becoming a client component.
export default function StudentAudioPlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerProvider>
      {children}
      <MiniAudioPlayerBar />
    </AudioPlayerProvider>
  );
}
