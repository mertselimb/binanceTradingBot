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
    if (rsi < 35 && nextOrder === "buy") {
      tl += usdt * usdttryData.close[i + optInTimePeriod];
      usdt = 0;
      busd += tl / busdtryData.close[i + optInTimePeriod];
      tl = 0;
    } else if (rsi > 65 && nextOrder === "sell") {
      tl += usdt * busdtryData.close[i + optInTimePeriod];
      busd = 0;
      usdt += tl / usdttryData.close[i + optInTimePeriod];
      tl = 0;
    }
  });

  console.log("tl: " + tl, "usdt: " + usdt, "busd: " + busd);
  const result =
    usdt * usdttryData.close[len - 1] + busd * busdtryData.close[len - 1] + tl;
  console.log("result:" + result, "percentage: " + result / 100000);
};
deneme();

app.listen(process.env.PORT || port, () => {
  console.log(
    `Binance Trading Bot listening at http://localhost:${
      process.env.PORT || port
    }`
  );
});
