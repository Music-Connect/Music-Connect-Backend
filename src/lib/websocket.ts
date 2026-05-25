import type { WebSocket } from "@fastify/websocket";

// Armazena as conexões ativas: Map<userId, WebSocket[]>
// (Um usuário pode estar conectado em múltiplas abas/dispositivos)
class WebSocketManager {
  private connections = new Map<string, Set<WebSocket>>();

  addConnection(userId: string, socket: WebSocket) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)?.add(socket);

    socket.on("close", () => {
      this.removeConnection(userId, socket);
    });
  }

  removeConnection(userId: string, socket: WebSocket) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(socket);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  sendMessageToUser(userId: string, message: any) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const payload = JSON.stringify(message);
      for (const socket of userConnections) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      }
    }
  }
}

export const wsManager = new WebSocketManager();
