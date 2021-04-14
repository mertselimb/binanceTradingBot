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
    intervalType = "m",
    timeZone = "TRT"
  ) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.logger = logger;
    this.optInTimePeriod = optInTimePeriod;
    this.interval = interval;
    this.intervalType = intervalType;
    this.nextOrder = "sell";
    this.timeZone = timeZone;
    this.logger("BinanceBot initialized.");

    //this.stop()
    //this.simulate();
    //this.orderMarketBuy("BUSD_TRY", 10);
    //this.orderMarketSellAll("BUSD_TRY", "BUSD");
    //this.orderMarketBuyAll("USDT_TRY", "TRY");
    this.start();
    //this.queryOrder("BUSD_TRY", 21708732);
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

    let status;
    if (json.data) {
      const query = await this.queryOrder(symbol, json.data.orderId);
      status = query.data.status;
      if (query.data.status === 2) {
        this.logger("BUY: " + symbol);
      } else {
        this.logger("ERROR: BUY " + symbol + " status: " + query.data.status);
      }
    } else {
      status = json.code;
      if (json.code === 3210) {
        this.logger("ERROR: BUY " + symbol + " - There is no " + main);
      } else {
        this.logger("ERROR: BUY " + symbol + " status: " + json.msg);
      }
    }

    const result = { ...json, status };
    console.log(result);
    return result;
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

    let status;
    if (json.data) {
      const query = await this.queryOrder(symbol, json.data.orderId);
      status = query.data.status;
      if (query.data.status === 2) {
        this.logger("BUY: " + symbol);
      } else {
        this.logger("ERROR: BUY " + symbol + " status: " + query.data.status);
      }
    } else {
      status = json.code;
      if (json.code === 3210) {
        this.logger("ERROR: BUY " + symbol + " - There is no " + main);
      } else {
        this.logger("ERROR: BUY " + symbol + " status: " + json.msg);
      }
    }

    const result = { ...json, status };
    console.log(result);
    return result;
  }

  async orderLimitBuyAll(symbol, price, main) {
    let quantity = await this.getAssetAmount(main);
    quantity = this.toFixed(parseFloat(quantity), 2);
    price = this.toFixed(price, 3);
    this.logger(
      "START BUY LIMIT: " +
        symbol +
        " quantity: " +
        quantity +
        " price: " +
        price
    );
    let queryString =
      "symbol=" +
      symbol +
      "&price=" +
      price +
      "&side=0&type=1&quantity=" +
      quantity +
      "%timeInForce=" +
      this.timeZone +
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

    let status;
    if (json.data) {
      const query = await this.queryOrder(symbol, json.data.orderId);
      status = query.data.status;
      if (query.data.status === 2) {
        this.logger(
          "DONE BUY LIMIT: " +
            symbol +
            " quantity: " +
            quantity +
            " price: " +
            price
        );
      } else {
        this.logger(
          "ERROR BUY LIMIT: " +
            symbol +
            " quantity: " +
            quantity +
            " price: " +
            price +
            " status: " +
            query.data.status
        );
      }
    } else {
      status = json.code;
      if (json.code === 3210) {
        this.logger(
          "ERROR BUY LIMIT: " +
            symbol +
            " quantity: " +
            quantity +
            " price: " +
            price +
            " - There is no " +
            main
        );
      } else {
        this.logger(
          "ERROR BUY LIMIT: " +
            symbol +
            " quantity: " +
            quantity +
            " price: " +
            price +
            " msg: " +
            json.msg
        );
      }
    }

    const result = { ...json, status };
    console.log(result);
    return result;
  }

  async orderLimitSellAll(symbol, price, main) {
    let quantity = await this.getAssetAmount(main);
    quantity = this.toFixed(parseFloat(quantity), 3);
    price = this.toFixed(price, 3);
    this.logger(
      "START SELL LIMIT: " +
        symbol +
        " quantity: " +
        quantity +
        " price: " +
        price
    );
    let queryString =
      "symbol=" +
      symbol +
      "&price=" +
      price +
      "&side=1&type=1&quantity=" +
      quantity +
      "%timeInForce=" +
      this.timeZone +
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

    let status;
    if (json.data) {
      let query = await this.queryOrder(symbol, json.data.orderId);
      status = query.data.status;
      if (query.data.status === 2) {
        this.logger(
          "DONE SELL LIMIT: " +
            symbol +
            " quantity: " +
            quantity +
            " price: " +
            price
        );
      } else {
        let tryAmount = 1;
        while (query.data.status != 2 || tryAmount < 25) {
          query = await this.queryOrder(symbol, json.data.orderId);
          tryAmount++;
        }
        if (query.data.status === 2) {
          this.logger(
            "DONE SELL LIMIT: " +
              symbol +
              " quantity: " +
              quantity +
              " price: " +
              price
          );
        } else {
          this.logger(
            "ERROR SELL LIMIT: " +
              symbol +
              " quantity: " +
              quantity +
              " price: " +
              price +
              " status: " +
              query.data.status
          );
        }
      }
    } else {
      status = json.code;
      if (json.code === 3210) {
        this.logger(
          "ERROR SELL LIMIT: " +
            symbol +
            " quantity: " +
            quantity +
            " price: " +
            price +
            " - There is no " +
            main
        );
      } else {
        this.logger(
          "ERROR SELL LIMIT: " +
            symbol +
            " quantity: " +
            quantity +
            " price: " +
            price +
            " status: " +
            json.msg
        );
      }
    }

    const result = { ...json, status };
    console.log(result);
    return result;
  }

  async orderMarketSellAll(symbol, main) {
    let quantity = await this.getAssetAmount(main);
    quantity = this.toFixed(parseFloat(quantity), 2);
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

    let status;
    if (json.data) {
      let query = await this.queryOrder(symbol, json.data.orderId);
      status = query.data.status;
      if (query.data.status === 2) {
        this.logger("SELL: " + symbol);
      } else {
        let tryAmount = 1;
        while (query.data.status != 2 || tryAmount < 10) {
          query = await this.queryOrder(symbol, json.data.orderId);
          tryAmount++;
        }
        if (query.data.status === 2) {
          this.logger("SELL: " + symbol);
        } else {
          this.logger(
            "ERROR: SELL " + symbol + " status: " + query.data.status
          );
        }
      }
    } else {
      status = json.code;
      if (json.code === 3210) {
        this.logger("ERROR: SELL " + symbol + " - There is no " + main);
      } else {
        this.logger("ERROR: SELL " + symbol + " status: " + json.msg);
      }
    }

    const result = { ...json, status };
    console.log(result);
    return result;
  }

  async queryOrder(symbol, id) {
    let queryString =
      "symbol=" +
      symbol +
      "&orderId=" +
      id +
      "&timestamp=" +
      new Date().getTime();
    queryString += "&signature=" + this.getSignature(queryString);

    const response = await fetch(
      "http://www.trbinance.com/open/v1/orders/detail" + "?" + queryString,
      {
        method: "GET",
        headers: {
          "X-MBX-APIKEY": this.apiKey,
        },
      }
    );
    const json = await response.json();
    console.log(json);
    return { ...json, status: response.status };
  }

  async turn() {
    const busdtryData = await this.getKlines(
      "BUSDTRY",
      this.interval + this.intervalType,
      this.optInTimePeriod + 1
    );
    const usdttryData = await this.getKlines(
      "USDTTRY",
      this.interval + this.intervalType,
      this.optInTimePeriod + 1
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

    const index = busdusdtData.rsi.length - 1;
    const priceIndex = busdusdtData.close.length - 1;
    const rate = busdusdtData.close[priceIndex];
    const rsi = busdusdtData.rsi[index];
    if (rsi < 45 && this.nextOrder === "buy") {
      this.logger("------------------------------");
      this.logger("RATE: " + 1 / rate);
      this.logger("RSI: " + rsi);

      await this.orderLimitSellAll(
        "USDT_TRY",
        usdttryData.close[priceIndex],
        "USDT"
      );
      setTimeout(async () => {
        await this.orderLimitBuyAll(
          "BUSD_TRY",
          busdtryData.close[priceIndex],
          "TRY"
        );

        this.logger("AMOUNT: BUSD " + (await this.getAssetAmount("BUSD")));
        this.nextOrder = "sell";
        this.logger("NEXTORDER: " + this.nextOrder);
      }, 10000);
    } else if (rsi > 55 && this.nextOrder === "sell") {
      this.logger("------------------------------");
      this.logger("RATE: " + rate);
      this.logger("RSI: " + rsi);

      await this.orderLimitSellAll(
        "BUSD_TRY",
        busdtryData.close[priceIndex],
        "BUSD"
      );
      setTimeout(async () => {
        await this.orderLimitBuyAll(
          "USDT_TRY",
          usdttryData.close[priceIndex],
          "TRY"
        );

        this.logger("AMOUNT: USDT " + (await this.getAssetAmount("USDT")));
        this.nextOrder = "buy";
        this.logger("NEXTORDER: " + this.nextOrder);
      }, 10000);
    }
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
    const startUSDT = 100000;
    let tl = 0;
    let usdt = startUSDT;
    let busd = 0;
    let rateResult = 100000;
    let count = 0;
    busdusdtData.rsi.forEach((rsi, i) => {
      const rate = busdusdtData.close[i + optInTimePeriod];
      if (rsi < 45 && this.nextOrder === "buy") {
        this.logger("BUY BUSDTRY: ");
        this.logger("1/RATE: " + 1 / rate, "RSI: " + rsi);
        this.logger("USDT: " + usdt);
        this.logger("BUSD: " + busd);
        tl += usdt * usdttryData.close[i + optInTimePeriod];
        usdt = 0;
        busd += tl / busdtryData.close[i + optInTimePeriod];
        tl = 0;
        rateResult *= 1 / rate;
        this.nextOrder = "sell";
        this.logger("USDT: " + usdt);
        this.logger("BUSD: " + busd);
        count++;
      } else if (rsi > 55 && this.nextOrder === "sell") {
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
        this.nextOrder = "buy";
        count++;
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
    this.logger("COUNT: " + count);
    this.logger("COUNT PER YEAR: " + count * timesPerYear);
    // this.logger("RateResult:" + rateResult);
    // this.logger("Percentage: %" + (resultRatePercent - 1) * 100);
    // this.logger(
    //   "Yearly percentage: %" +
    //     (Math.pow(resultRatePercent, timesPerYear) - 1) * 100
    // );
    // this.logger("Times per year: " + timesPerYear);
  }

  async start() {
    this.logger("Starting the bot...");
    this.turn();
    this.turnInterval = setInterval(() => {
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
