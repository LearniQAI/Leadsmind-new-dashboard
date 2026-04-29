'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConnectPlatformsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectPlatformsModal({ open, onOpenChange }: ConnectPlatformsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Platforms</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-center text-sm text-muted-foreground">
          Platform connection settings will appear here. This is a placeholder.
        </div>
      </DialogContent>
    </Dialog>
  );
}
