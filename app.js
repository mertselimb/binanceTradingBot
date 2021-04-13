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

const binanceBot = new BinanceBot(
  config.apiKey,
  config.apiSecret,
  logger,
  14,
  5,
  "m"
);

function logger(log) {
  const newLog = new Date().toLocaleString() + " : " + log;
  logs.push(newLog);
  console.log(newLog);
}

app.get("/", function (req, res) {
  res.send(logs);
});

app.listen(process.env.PORT || port, () => {
  logger(
    `Binance Trading Bot listening at http://localhost:${
      process.env.PORT || port
    }`
  );
});
