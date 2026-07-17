import { createHmac } from 'crypto';

// Shared by confirmReceiptAction (verifies a token from a public confirm
// link) and the /track/[shipmentId] server component (mints a token for a
// shipment it just fetched itself). Deliberately NOT in a 'use server' file:
// this used to be exported from shipments.ts as generateShipmentTokenAction,
// which made it an independently client-invocable Server Action with zero
// argument validation — confirmed live (via the build's
// server-reference-manifest.json, which labelled this action's layer as
// "action-browser" for the /shipments route, and the action's hashed id
// present in that route's public static JS chunk) that any authenticated
// platform user could call it directly with an arbitrary shipmentId and
// receive back the exact token confirmReceiptAction treats as proof of
// recipient authorization, for any workspace's shipment. A plain function
// has no such boundary — it can only run on the server that already holds
// the real shipment row.
export function generateShipmentToken(shipmentId: string): string {
  const secret = process.env.ENCRYPTION_KEY || 'courier-secret';
  return createHmac('sha256', secret).update(shipmentId).digest('hex');
}
