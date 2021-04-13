const express = require("express"),
  bodyParser = require("body-parser"),
  config = require('./config.json'),
  BinanceBotServer = require("./BinanceBot"),
  app = express(),
  port = 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

let logs = [];

const binanceBot = new BinanceBotServer.BinanceBot(config.apiKey, config.apiSecret);

 const deneme = async () => {
     console.log(await binanceBot.getAssetAmount("ADA"));
}
deneme();

app.listen(process.env.PORT || port, () => {
    console.log(
      `Binance Trading Bot listening at http://localhost:${process.env.PORT || port}`
    );
  });