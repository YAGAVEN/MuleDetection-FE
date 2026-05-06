/**
 * WebSocket Service for Real-time Updates
 * Handles GAN training progress and other real-time events
 */

export class WebSocketService {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.callbacks = {};
    this.messageQueue = [];
  }

  /**
   * Connect to WebSocket
   */
  connect(handlers = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected:', this.url);
          this.reconnectAttempts = 0;

          // Send any queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
          }

          if (handlers.onOpen) handlers.onOpen();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);

            // Route message to appropriate handler
            if (data.type && this.callbacks[data.type]) {
              this.callbacks[data.type](data);
            }

            if (handlers.onMessage) handlers.onMessage(data);
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (handlers.onError) handlers.onError(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          if (handlers.onClose) handlers.onClose();
          this.attemptReconnect(handlers);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Send message through WebSocket
   */
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
    }
  }

  /**
   * Subscribe to specific message type
   */
  on(type, callback) {
    this.callbacks[type] = callback;
  }

  /**
   * Unsubscribe from specific message type
   */
  off(type) {
    delete this.callbacks[type];
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect(handlers) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect(handlers).catch(() => {
          // Reconnection attempt failed
        });
      }, this.reconnectDelay);
    }
  }

  /**
   * Close WebSocket connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// GAN Training WebSocket Service
export class GANWebSocketService extends WebSocketService {
  constructor(trainingId) {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/api/v1/gan/ws/training/${trainingId}`;
    super(wsUrl);
    this.trainingId = trainingId;
  }

  /**
   * Subscribe to training progress updates
   */
  onProgress(callback) {
    this.on('progress', callback);
  }

  /**
   * Subscribe to training completion
   */
  onComplete(callback) {
    this.on('completed', callback);
  }

  /**
   * Subscribe to training errors
   */
  onError(callback) {
    this.on('error', callback);
  }

  /**
   * Subscribe to metrics updates
   */
  onMetrics(callback) {
    this.on('metrics', callback);
  }
}

export default WebSocketService;
