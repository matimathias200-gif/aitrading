/**
 * EXTENDED PROMPT FOR CLAUDE AI - BITCOIN SIGNAL GENERATION
 * Utilise toutes les données disponibles pour maximiser la qualité des signaux
 */

export function buildExtendedPrompt(data: {
  market: any;
  indicators: any;
  reputation: number;
  successRate: number;
  cachedApis?: any[];
  historicalOHLC?: any;
  orderbook?: any;
  perp?: any;
  onchain?: any;
  riskProfile?: string;
  capital?: number;
}): string {
  const {
    market,
    indicators,
    reputation,
    successRate,
    cachedApis = [],
    historicalOHLC,
    orderbook,
    perp,
    onchain,
    riskProfile = 'modéré',
    capital = 10000
  } = data;

  // Extract news sentiment
  let newsCount = 0;
  let newsSentiment = 'neutral';
  let newsHeadlines: string[] = [];

  const newsCache = cachedApis.find(a => a.api_name === 'cryptopanic' || a.source === 'cryptopanic_news');
  if (newsCache) {
    const newsData = newsCache.response_data || newsCache.data;
    newsCount = Array.isArray(newsData) ? newsData.length : 0;
    if (Array.isArray(newsData)) {
      newsHeadlines = newsData.slice(0, 5).map((n: any) => n.title || n.news || '');
      const positive = newsData.filter((n: any) => n.votes?.positive > n.votes?.negative).length;
      const negative = newsData.filter((n: any) => n.votes?.negative > n.votes?.positive).length;
      if (positive > negative * 1.5) newsSentiment = 'bullish';
      else if (negative > positive * 1.5) newsSentiment = 'bearish';
    }
  }

  // Extract on-chain data
  let activeAddresses = 'N/A';
  let socialVolume = 'N/A';
  let exchangeInflow = 'N/A';
  let exchangeOutflow = 'N/A';

  const santimentCache = cachedApis.find(a => a.api_name === 'santiment' || a.source === 'santiment_onchain_bitcoin');
  if (santimentCache) {
    const santimentData = santimentCache.response_data || santimentCache.data;
    if (santimentData) {
      activeAddresses = santimentData.daily_active_addresses || santimentData.getMetric?.timeseriesData?.[0]?.value || 'N/A';
      socialVolume = santimentData.social_volume || santimentData.socialVolume?.timeseriesData?.[0]?.value || 'N/A';
      exchangeInflow = santimentData.exchange_inflow || onchain?.exchange_inflow || 'N/A';
      exchangeOutflow = santimentData.exchange_outflow || onchain?.exchange_outflow || 'N/A';
    }
  }

  const currentPrice = parseFloat(market.lastPrice);
  const change24h = parseFloat(market.priceChangePercent);
  const volume24h = parseFloat(market.volume);
  const high24h = parseFloat(market.highPrice);
  const low24h = parseFloat(market.lowPrice);

  // Calculate volatility
  const volatility24h = ((high24h - low24h) / low24h) * 100;
  const atr = indicators.atr || volatility24h * currentPrice / 100;

  // Build comprehensive prompt
  return `You are a professional crypto market analyst (French output). Analyze BTCUSDT on timeframes 1h, 4h and 1d. Use ALL provided data blocks and produce a single clear trading recommendation with TP and SL.

INPUT DATA:

Market Data:
{
  "last": ${currentPrice.toFixed(2)},
  "change_24h": ${change24h.toFixed(2)},
  "volume_24h": ${volume24h.toFixed(0)},
  "high_24h": ${high24h.toFixed(2)},
  "low_24h": ${low24h.toFixed(2)},
  "volatility_24h": ${volatility24h.toFixed(2)}
}

Technical Indicators:
{
  "rsi": ${indicators.rsi.toFixed(2)},
  "macd": ${indicators.macd.macd.toFixed(2)},
  "macd_signal": ${indicators.macd.signal.toFixed(2)},
  "macd_histogram": ${indicators.macd.histogram.toFixed(2)},
  "ema20": ${indicators.ema20.toFixed(2)},
  "ema50": ${indicators.ema50.toFixed(2)},
  "atr": ${atr.toFixed(2)},
  "volume_ratio": ${indicators.volume.toFixed(2)},
  "price_change_1h": ${indicators.priceChange.toFixed(2)}
}

${orderbook ? `OrderBook:
{
  "best_bid": ${orderbook.best_bid},
  "best_ask": ${orderbook.best_ask},
  "spread_pct": ${orderbook.spread_pct}
}` : ''}

${perp ? `Perpetual Markets:
{
  "funding_rate": ${perp.funding_rate},
  "open_interest": ${perp.open_interest}
}` : ''}

On-Chain Metrics:
{
  "active_addresses_24h": "${activeAddresses}",
  "social_volume": "${socialVolume}",
  "exchange_inflow": "${exchangeInflow}",
  "exchange_outflow": "${exchangeOutflow}"
}

News & Sentiment:
{
  "sentiment": "${newsSentiment}",
  "news_count_24h": ${newsCount},
  "headlines": ${JSON.stringify(newsHeadlines.slice(0, 3))}
}

Trading Context:
{
  "reputation_score": ${reputation.toFixed(2)},
  "success_rate": ${successRate.toFixed(2)},
  "risk_profile": "${riskProfile}",
  "available_capital": ${capital}
}

${historicalOHLC ? `Historical OHLC (last 7 days summary):
{
  "avg_volume": ${historicalOHLC.avg_volume},
  "trend_7d": "${historicalOHLC.trend}",
  "support_level": ${historicalOHLC.support},
  "resistance_level": ${historicalOHLC.resistance}
}` : ''}

OUTPUT (strict JSON only, no markdown, no backticks):
{
  "symbol": "BTCUSDT",
  "signal_type": "BUY" | "SELL" | "WAIT",
  "confidence": 0-100,
  "entry_price": <number>,
  "take_profit": <number>,
  "stop_loss": <number>,
  "horizon_minutes": <number>,
  "position_size_pct": <number>,
  "reason": {
    "explain": "<explication brève en français (1-2 phrases)>",
    "indicators": ["liste", "des", "indicateurs", "clés", "qui motivent la décision"]
  }
}

DECISION RULES (STRICT):

1. **Confidence Formula**:
   - Base confidence = (reputation * 0.25) + (indicator_concordance * 0.60) + (sentiment_score * 0.15)
   - indicator_concordance: count agreeing indicators (RSI + MACD + EMA trend) / 3
   - sentiment_score: bullish=100, neutral=50, bearish=0

2. **Signal Threshold**:
   - BUY/SELL only if confidence > 65
   - If confidence ≤ 65 => WAIT

3. **TP/SL Sizing**:
   - Base TP% = 2.0% (BUY) or -2.0% (SELL)
   - Base SL% = 1.0% (BUY) or -1.0% (SELL)
   - Adjust by volatility: TP% *= (1 + volatility_24h / 100)
   - Adjust by reputation: if reputation > 70 => widen TP/SL by +20%, if reputation < 50 => tighten by -20%
   - ATR adjustment: if ATR > 2% of price => widen SL by 0.5%

4. **Position Sizing**:
   - Conservative: 2-5% of capital
   - Modéré: 5-10% of capital
   - Agressif: 10-20% of capital
   - Reduce by 50% if confidence < 75

5. **Market Conditions Checks**:
   - If funding_rate > 0.1% AND open_interest rising => caution (potential squeeze) => reduce confidence by 10pts
   - If exchange_inflow > exchange_outflow (significant) => bearish pressure => reduce confidence by 5pts
   - If news negative in last 24h => reduce confidence by 15pts
   - If RSI > 75 or RSI < 25 => extreme zone => reduce confidence by 10pts unless strong trend confirmation

6. **Validation Rules**:
   - NEVER return take_profit == entry_price
   - For BUY: TP > entry_price, SL < entry_price
   - For SELL: TP < entry_price, SL > entry_price
   - If computed TP equals entry due to rounding => shift TP by 0.1% minimum
   - horizon_minutes: 60 (scalp), 240 (intraday), 1440 (swing)

7. **Fallback**:
   - If any critical field missing => return WAIT with clear reason
   - If indicators conflicting (RSI bullish but MACD bearish) => reduce confidence or WAIT

Return ONLY the JSON object. No extra text, no markdown formatting.`;
}
