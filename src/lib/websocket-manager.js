export class BinanceWebSocketManager {
  constructor(symbols, onMessage) {
    this.symbols = symbols;
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isIntentionallyClosed = false;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const tickers = JSON.parse(event.data);
        const relevantTickers = tickers.filter(ticker =>
          this.symbols.includes(ticker.s.toLowerCase())
        );

        if (relevantTickers.length > 0 && this.onMessage) {
          this.onMessage(relevantTickers);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');

      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

        setTimeout(() => {
          this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  updateSymbols(newSymbols) {
    this.symbols = newSymbols;
  }
}
