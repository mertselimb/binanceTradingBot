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
  const busdtryData = await binanceBot.getKlines("BUSDTRY", "5m", len);
  const usdttryData = await binanceBot.getKlines("USDTTRY", "5m", len);
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
  busdusdtData.rsi.forEach((rsi, i) => {
    const diff =
      busdtryData.open[i + optInTimePeriod] -
      usdttryData.open[i + optInTimePeriod];
    if (rsi < 45 && nextOrder === "buy") {
      console.log(
        "BUY usdttry: " + usdttryData.open[i + optInTimePeriod],
        "SELL busdtry: " + busdtryData.open[i + optInTimePeriod],
        "DIFF: " + diff
      );
      tl += usdt * usdttryData.open[i + optInTimePeriod];
      usdt = 0;
      busd += tl / busdtryData.open[i + optInTimePeriod];
      tl = 0;
      nextOrder = "sell";
    } else if (rsi > 55 && nextOrder === "sell") {
      console.log(
        "SELL busdtry: " + busdtryData.open[i + optInTimePeriod],
        "BUY usdttry: " + usdttryData.open[i + optInTimePeriod],
        "DIFF: " + -diff
      );
      tl += busd * busdtryData.open[i + optInTimePeriod];
      busd = 0;
      usdt += tl / usdttryData.open[i + optInTimePeriod];
      tl = 0;
      nextOrder = "buy";
    }
  });

  console.log("tl: " + tl, "usdt: " + usdt, "busd: " + busd);
  const result =
    usdt * usdttryData.close[len - 1] + busd * busdtryData.close[len - 1] + tl;
  console.log("result:" + result, "percentage: %" + (result / 100000) * 100);
};
deneme();

app.listen(process.env.PORT || port, () => {
  console.log(
    `Binance Trading Bot listening at http://localhost:${
      process.env.PORT || port
    }`
  );
});
