const { createHmac } = require("crypto"),
  RSI = require("technicalindicators").RSI,
  fetch = require("node-fetch");

export class BinanceBot {
  constructor(
    apiKey,
    secretKey,
    logger,
    optInTimePeriod = 14,
    interval = 5,
    intervalType = "m"
  ) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.logger = logger;
    this.optInTimePeriod = optInTimePeriod;
    this.interval = interval;
    this.intervalType = intervalType;
    this.nextOrder = "buy";
    this.logger("BinanceBot initialized.");
    //this.stop()
    //this.simulate();
    //this.orderMarketBuy("BUSD_TRY", 10);
    //this.orderMarketBuyAll("BUSD_TRY", "TRY");
    //this.orderMarketSellAll("BUSD_TRY", "BUSD");
    this.start();
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
      this.logger("Market data is empty");
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
        this.logger("BUY BUSDTRY: ");
        this.logger("1/RATE: " + 1 / rate, "RSI: " + rsi);
        this.logger("USDT: " + usdt);
        this.logger("BUSD: " + busd);
        tl += usdt * usdttryData.close[i + optInTimePeriod];
        usdt = 0;
        busd += tl / busdtryData.close[i + optInTimePeriod];
        tl = 0;
        rateResult *= 1 / rate;
        nextOrder = "sell";
        this.logger("USDT: " + usdt);
        this.logger("BUSD: " + busd);
      } else if (rsi > 55 && nextOrder === "sell") {
        this.logger("BUY *USDTTRY: ");
        this.logger("RATE: " + rate);
        this.logger("RSI: " + rsi);
        this.logger("USDT: " + usdt);
        this.logger("BUSD: " + busd);
        tl += busd * busdtryData.close[i + optInTimePeriod];
        busd = 0;
        usdt += tl / usdttryData.close[i + optInTimePeriod];
        tl = 0;
        rateResult *= rate;
        nextOrder = "buy";
        this.logger("USDT: " + usdt);
        this.logger("BUSD: " + busd);
      }
    });

    this.logger("RESULTS:");
    this.logger("USDT: " + usdt, "BUSD: " + busd);
    const result =
      usdt +
      (busd * busdtryData.close[len - 1] + tl) / usdttryData.close[len - 1];
    const resultPercent = result / startUSDT;
    // const resultRatePercent = rateResult / startUSDT;
    const timesPerYear = ((365 / interval) * len) / 60 / 24;
    this.logger("Result:" + result);
    this.logger("Percentage: %" + (resultPercent - 1) * 100);
    this.logger(
      "Yearly percentage: %" + (Math.pow(resultPercent, timesPerYear) - 1) * 100
    );
    this.logger("Times per year: " + timesPerYear);
    // this.logger("RateResult:" + rateResult);
    // this.logger("Percentage: %" + (resultRatePercent - 1) * 100);
    // this.logger(
    //   "Yearly percentage: %" +
    //     (Math.pow(resultRatePercent, timesPerYear) - 1) * 100
    // );
    // this.logger("Times per year: " + timesPerYear);
  }

  async orderMarketBuy(symbol, quoteOrderQty) {
    let queryString =
      "symbol=" +
      symbol +
      "&side=0&type=2&quoteOrderQty=" +
      quoteOrderQty +
      "&timestamp=" +
      new Date().getTime();
    queryString += "&signature=" + this.getSignature(queryString);

    const response = await fetch(
      "http://www.trbinance.com/open/v1/orders" + "?" + queryString,
      {
        method: "POST",
        headers: {
          "X-MBX-APIKEY": this.apiKey,
        },
      }
    );
    const json = await response.json();
    this.logger(json);
  }

  async orderMarketBuyAll(symbol, main) {
    let quantity = await this.getAssetAmount(main);
    let queryString =
      "symbol=" +
      symbol +
      "&side=0&type=2&quoteOrderQty=" +
      quantity +
      "&timestamp=" +
      new Date().getTime();
    queryString += "&signature=" + this.getSignature(queryString);

    const response = await fetch(
      "http://www.trbinance.com/open/v1/orders" + "?" + queryString,
      {
        method: "POST",
        headers: {
          "X-MBX-APIKEY": this.apiKey,
        },
      }
    );
    const json = await response.json();
    this.logger(json);
  }

  async orderMarketSellAll(symbol, main) {
    let quantity = await this.getAssetAmount(main);
    quantity = this.toFixed(parseFloat(quantity), 2);
    this.logger(quantity);
    let queryString =
      "symbol=" + symbol + "&side=1&type=2&quantity=" + quantity;
    +"&timestamp=" + new Date().getTime();
    queryString += "&signature=" + this.getSignature(queryString);

    const response = await fetch(
      "http://www.trbinance.com/open/v1/orders" + "?" + queryString,
      {
        method: "POST",
        headers: {
          "X-MBX-APIKEY": this.apiKey,
        },
      }
    );
    const json = await response.json();
    this.logger(json);
  }

  async turn() {
    const busdtryData = await this.getKlines(
      "BUSDTRY",
      this.interval + this.intervalType,
      this.optInTimePeriod
    );
    const usdttryData = await this.getKlines(
      "USDTTRY",
      this.interval + this.intervalType,
      this.optInTimePeriod
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

    busdusdtData = await this.calcRsi(busdusdtData, this.optInTimePeriod);

    const rate = busdusdtData.close[i + optInTimePeriod];
    const rsi = busdusdtData.rsi[busdusdtData.rsi.length - 1];
    if (rsi < 45 && this.nextOrder === "buy") {
      this.logger("BUY BUSDTRY: ");
      this.logger("1/RATE: " + 1 / rate);
      this.logger("RSI: " + rsi);

      this.orderMarketSellAll("USDT_TRY", "USDT");
      this.orderMarketBuyAll("BUSD_TRY", "TRY");
      this.logger("BUSD at hand: " + (await this.getAssetAmount("BUSD")));

      nextOrder = "sell";
    } else if (rsi > 55 && this.nextOrder === "sell") {
      this.logger("BUY *USDTTRY: ");
      this.logger("RATE: " + rate);
      this.logger("RSI: " + rsi);

      this.orderMarketSellAll("BUSD_TRY", "USDT");
      this.orderMarketBuyAll("USDT_TRY", "TRY");
      this.logger("USDT at hand: " + (await this.getAssetAmount("USDT")));

      nextOrder = "buy";
    }

    /*
      USDTTRY ve BUSD için 14 lü grafikleri al.
      Hesaptaki paraları al.
      RSI hesapla.
      RSI eşiklere uygunsa{
        BUSD ALMA{
          USDT varsa ve eşiği geçiyorsa sat.
          Başarılı olduysa{
            BUSD al.
            Başarılı olduysa{
              ok
            }olmadıysa{
              Tekrar dene.
            }
          }olmadıysa{
            Bir daha dene.
          }
        }
        USDT ALMA{
          BUSD varsa ve eşiği geçiyorsa sat.
          Başarılı olduysa{
            USDT al.
            Başarılı olduysa{
              ok
            }olmadıysa{
              Tekrar dene.
            }
          }olmadıysa{
            Bir daha dene.
          }
        }
      }
    
    */
  }

  async start() {
    this.logger("Starting the bot...");
    this.turnInterval = setInterval(function () {
      this.turn();
    }, 300000);
  }

  async stop() {
    this.logger("Stopping the bot...");
    clearInterval(this.turnInterval);
  }

  getSignature(message) {
    return createHmac("sha256", this.secretKey).update(message).digest("hex");
  }

  toFixed(num, fixed) {
    var re = new RegExp("^-?\\d+(?:.\\d{0," + (fixed || -1) + "})?");
    return num.toString().match(re)[0];
  }
}
