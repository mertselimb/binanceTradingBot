import { createHmac } from 'crypto';
const fetch = require("node-fetch");
export class BinanceBot {

    constructor(apiKey, secretKey) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        console.log("BinanceBot initialized.")
    }

    async getTime(){
        const response = await fetch("http://www.trbinance.com/open/v1/common/time", {
            method: 'GET'
        });
        return response.json();
    }

    async updateAccountAssets(){
        let queryString = "timestamp=" + new Date().getTime();
        queryString += "&signature=" + this.hash(queryString);

        const response = await fetch("http://www.trbinance.com/open/v1/account/spot" + "?" + queryString, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': this.apiKey
              }
        })
        const json = await response.json();
        this.accountAssets =  json.data.accountAssets;
        
    }

    async getAssetAmount(asset){
        await this.updateAccountAssets();
        return this.accountAssets.find(x => x.asset === asset).free;
    }


    hash(message)  {
        return createHmac('sha256', this.secretKey)
               .update(message)
               .digest('hex');
    }

};
