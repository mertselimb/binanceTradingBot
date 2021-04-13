import hmacSHA512 from 'crypto-js/hmac-sha512';
import Base64 from 'crypto-js/enc-base64';
const fetch = require("node-fetch");
export class BinanceBot {

    constructor(apiKey, secretKey) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
    }

    async getTime(){
        const response = await fetch("http://www.trbinance.com/open/v1/common/time", {
            method: 'GET',
            // headers: {
            // 'Content-Type': 'application/json'
            // }
        });
        return response.json(); // parses JSON response into native JavaScript objects
    }


    hash(message)  {
        return Base64.stringify(hmacSHA512(message, this.secretKey));
    }

};
