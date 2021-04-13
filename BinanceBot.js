const { createHmac } = require("crypto"),
  talib = require("talib"),
  fetch = require("node-fetch");

export class BinanceBot {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    console.log("BinanceBot initialized.");
  }

  async getTime() {
    const response = await fetch(
      "http://www.trbinance.com/open/v1/common/time",
      {
        method: "GET",
      }
    );
    return response.json();
  }

  async updateAccountAssets() {
    let queryString = "timestamp=" + new Date().getTime();
    queryString += "&signature=" + this.getSignature(queryString);

    const response = await fetch(
      "http://www.trbinance.com/open/v1/account/spot" + "?" + queryString,
      {
        method: "GET",
        headers: {
          "X-MBX-APIKEY": this.apiKey,
        },
      }
    );
    const json = await response.json();
    this.accountAssets = json.data.accountAssets;
  }

  async getAssetAmount(asset) {
    await this.updateAccountAssets();
    return this.accountAssets.find((x) => x.asset === asset).free;
  }

  async getKlines(symbol, interval, limit = 500) {
    const response = await fetch(
      "https://api.binance.cc/api/v1/klines?symbol=" +
        symbol +
        "&interval=" +
        interval +
        "&limit=" +
        limit,
      {
        method: "GET",
      }
    );
    const json = await response.json();
    const marketData = await json.reduce(
      function (acc, data) {
        acc.open.push(data[1]);
        acc.close.push(data[4]);
        acc.high.push(data[2]);
        acc.low.push(data[3]);
        acc.volume.push(data[5]);
        return acc;
      },
      {
        open: [],
        close: [],
        high: [],
        low: [],
        volume: [],
      }
    );
    return marketData;
  }

  async calcRsi(marketData = [], optInTimePeriod = 9) {
    if (marketData.length === 0) {
      console.log("Market data is empty");
    }
    const rsi = await talib.execute({
      inReal: true,
      name: "RSI",
      startIdx: 0,
      endIdx: marketData.close.length - 1,
      high: marketData.high,
      low: marketData.low,
      close: marketData.close,
      optInTimePeriod,
    });

    return { ...marketData, rsi: rsi.result.outReal };
  }

  getSignature(message) {
    return createHmac("sha256", this.secretKey).update(message).digest("hex");
  }
}
