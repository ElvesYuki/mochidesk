import { invoke } from "@tauri-apps/api/core";
import type { LanMessage, NetworkEvent } from "$lib/models/lan-message";
import type { LanPeer } from "$lib/models/lan-peer";
import { isTauriRuntime } from "$lib/services/pet-window";

export const DEFAULT_LAN_PORT = 39457;

export interface LanMochiController {
  startListener: (port?: number) => Promise<number>;
  stopListener: () => Promise<void>;
  broadcastMessage: (message: LanMessage, port?: number) => Promise<void>;
  sendMessage: (target: string, message: LanMessage) => Promise<void>;
  getKnownPeers: () => Promise<LanPeer[]>;
  getRecentEvents: () => Promise<NetworkEvent[]>;
  getLocalIdentity: () => Promise<{ senderId: string; senderName: string }>;
}

export function createDefaultLanMessage(
  type: LanMessage["type"],
  senderId: string,
  senderName: string,
  payload: Record<string, unknown> = {},
): LanMessage {
  return {
    version: 1,
    type,
    senderId,
    senderName,
    timestamp: Date.now(),
    payload,
  };
}

export function createLanMochiController(): LanMochiController {
  if (!isTauriRuntime()) {
    return {
      async startListener(port = DEFAULT_LAN_PORT) {
        return port;
      },
      async stopListener() {},
      async broadcastMessage() {},
      async sendMessage() {},
      async getKnownPeers() {
        return [];
      },
      async getRecentEvents() {
        return [];
      },
      async getLocalIdentity() {
        return {
          senderId: "preview-mochi",
          senderName: "MochiDesk",
        };
      },
    };
  }

  return {
    startListener(port) {
      return invoke<number>("start_udp_listener", { port });
    },
    stopListener() {
      return invoke<void>("stop_udp_listener");
    },
    broadcastMessage(message, port) {
      return invoke<void>("broadcast_udp_message", { message, port });
    },
    sendMessage(target, message) {
      return invoke<void>("send_udp_message", { target, message });
    },
    getKnownPeers() {
      return invoke<LanPeer[]>("get_known_peers");
    },
    getRecentEvents() {
      return invoke<NetworkEvent[]>("get_recent_network_events");
    },
    getLocalIdentity() {
      return invoke<{ senderId: string; senderName: string }>("get_local_udp_identity");
    },
  };
}
