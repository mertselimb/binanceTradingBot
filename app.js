const express = require("express"),
  bodyParser = require("body-parser"),
  config = require("./config.json"),
  { BinanceBot } = require("./BinanceBot"),
  app = express(),
  port = 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

let logs = [];

const binanceBot = new BinanceBot(config.apiKey, config.apiSecret);

const deneme = async () => {
  const len = 1000;
  const interval = 5;
  const intervalType = "m";
  const busdtryData = await binanceBot.getKlines(
    "BUSDTRY",
    interval + intervalType,
    len
  );
  const usdttryData = await binanceBot.getKlines(
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
  const optInTimePeriod = 9;
  busdusdtData = await binanceBot.calcRsi(busdusdtData, optInTimePeriod);

  let nextOrder = "buy";
  let tl = 100000;
  let usdt = 0;
  let busd = 0;
  let rateResult = 100000;
  busdusdtData.rsi.forEach((rsi, i) => {
    const rate = busdusdtData.open[i + optInTimePeriod];
    if (rsi < 35 && nextOrder === "buy" && rate > 1) {
      console.log("BUY BUSDTRY: " + rate);
      tl += usdt * usdttryData.open[i + optInTimePeriod];
      usdt = 0;
      busd += tl / busdtryData.open[i + optInTimePeriod];
      tl = 0;
      rateResult *= rate;
      nextOrder = "sell";
    } else if (rsi > 65 && nextOrder === "sell" && rate < 1) {
      console.log("BUY *USDTTRY: " + 1 / rate);
      tl += busd * busdtryData.open[i + optInTimePeriod];
      busd = 0;
      usdt += tl / usdttryData.open[i + optInTimePeriod];
      tl = 0;
      rateResult *= 1 / rate;
      nextOrder = "buy";
    }
  });
  console.log("RESULTS:");
  console.log("TL: " + tl, "USDT: " + usdt, "BUSD: " + busd);
  const result =
    usdt * usdttryData.close[len - 1] + busd * busdtryData.close[len - 1] + tl;
  console.log(
    "Result:" + result,
    "Percentage: %" + result / 100000,
    "Yearly percentage: %" +
      Math.pow(result / 100000, ((365 / interval) * len) / 60 / 24),
    "Times per year: " + ((365 / interval) * len) / 60 / 24
  );
  console.log(
    "RateResult:" + rateResult,
    "Percentage: %" + rateResult / 100000,
    "Yearly percentage: %" +
      Math.pow(rateResult / 100000, ((365 / interval) * len) / 60 / 24),
    "Times per year: " + ((365 / interval) * len) / 60 / 24
  );
};
deneme();

app.listen(process.env.PORT || port, () => {
  console.log(
    `Binance Trading Bot listening at http://localhost:${
      process.env.PORT || port
    }`
  );
});
