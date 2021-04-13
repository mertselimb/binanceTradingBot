import { createHmac } from "crypto";
const fetch = require("node-fetch");
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

  async getKlines(symbol, interval) {
    const response = await fetch(
      "https://api.binance.cc/api/v1/klines?symbol=" +
        symbol +
        "&interval=" +
        interval,
      {
        method: "GET",
      }
    );
    const json = await response.json();

    const acc = {
      open: [],
      close: [],
      high: [],
      low: [],
      volume: [],
    };
    const reducer = (acc, data) => {
      acc.open.push(data[1]);
      acc.close.push(data[4]);
      acc.high.push(data[2]);
      acc.low.push(data[3]);
      acc.volume.push(data[5]);
      return acc;
    };
    const marketData = json.reduce(reducer, acc);
    return marketData;
  }

  getSignature(message) {
    return createHmac("sha256", this.secretKey).update(message).digest("hex");
  }
}
