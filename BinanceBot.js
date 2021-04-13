const { createHmac } = require("crypto"),
  RSI = require("technicalindicators").RSI,
  fetch = require("node-fetch");

export class BinanceBot {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    console.log("BinanceBot initialized.");
    this.simulate();
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

    const rsi = RSI.calculate({
      values: marketData.close,
      period: optInTimePeriod,
    });

    return { ...marketData, rsi };
  }

  async simulate() {
    const len = 1000;
    const interval = 5;
    const intervalType = "m";
    const busdtryData = await this.getKlines(
      "BUSDTRY",
      interval + intervalType,
      len
    );
    const usdttryData = await this.getKlines(
      "USDTTRY",
      interval + intervalType,
      len
    );

    let busdusdtData = {
      open: [],
      close: [],
      high: [],
      low: [],
      volume: [],
      rsi: [],
    };

    for (let i = 0; i < busdtryData.open.length; i++) {
      busdusdtData.open.push(busdtryData.open[i] / usdttryData.open[i]);
      busdusdtData.close.push(busdtryData.close[i] / usdttryData.close[i]);
      busdusdtData.high.push(busdtryData.high[i] / usdttryData.high[i]);
      busdusdtData.low.push(busdtryData.low[i] / usdttryData.low[i]);
      busdusdtData.volume.push(busdtryData.volume[i] / usdttryData.volume[i]);
    }
    const optInTimePeriod = 14;
    busdusdtData = await this.calcRsi(busdusdtData, optInTimePeriod);
    let nextOrder = "buy";
    const startUSDT = 100000;
    let tl = 0;
    let usdt = startUSDT;
    let busd = 0;
    let rateResult = 100000;

    busdusdtData.rsi.forEach((rsi, i) => {
      const rate = busdusdtData.close[i + optInTimePeriod];
      if (rsi < 45 && nextOrder === "buy") {
        console.log("BUY BUSDTRY: ", "1/RATE: " + 1 / rate, "RSI: " + rsi);
        console.log("USDT: " + usdt, "BUSD: " + busd);
        tl += usdt * usdttryData.close[i + optInTimePeriod];
        usdt = 0;
        busd += tl / busdtryData.close[i + optInTimePeriod];
        tl = 0;
        rateResult *= 1 / rate;
        nextOrder = "sell";
        console.log("USDT: " + usdt, "BUSD: " + busd);
      } else if (rsi > 55 && nextOrder === "sell") {
        console.log("BUY *USDTTRY: ", "RATE: " + rate, "RSI: " + rsi);
        console.log("USDT: " + usdt, "BUSD: " + busd);
        tl += busd * busdtryData.close[i + optInTimePeriod];
        busd = 0;
        usdt += tl / usdttryData.close[i + optInTimePeriod];
        tl = 0;
        rateResult *= rate;
        nextOrder = "buy";
        console.log("USDT: " + usdt, "BUSD: " + busd);
      }
    });

    console.log("RESULTS:");
    console.log("USDT: " + usdt, "BUSD: " + busd);
    const result =
      usdt +
      (busd * busdtryData.close[len - 1] + tl) / usdttryData.close[len - 1];
    const resultPercent = result / startUSDT;
    const resultRatePercent = rateResult / startUSDT;
    const timesPerYear = ((365 / interval) * len) / 60 / 24;
    console.log(
      "Result:" + result,
      "Percentage: %" + (resultPercent - 1) * 100,
      "Yearly percentage: %" +
        (Math.pow(resultPercent, timesPerYear) - 1) * 100,
      "Times per year: " + timesPerYear
    );
    console.log(
      "RateResult:" + rateResult,
      "Percentage: %" + (resultRatePercent - 1) * 100,
      "Yearly percentage: %" +
        (Math.pow(resultRatePercent, timesPerYear) - 1) * 100,
      "Times per year: " + timesPerYear
    );
  }

  getSignature(message) {
    return createHmac("sha256", this.secretKey).update(message).digest("hex");
  }
}
