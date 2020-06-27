const puppeteer = require('puppeteer');
const fs = require('fs')
const extractor = require('unfluff');
var readabilityScores = require('readability-scores')
const dirName = require('./dirname.js');

let page;
let browser;
const width = 1200;
const height = 800;

async function rockit() {
  browser = await puppeteer.launch({
    headless: true,   slowMo: 80,   args: [`--window-size=${width},${height}`]
  });
  page = await browser.newPage();
  await page.setViewport({ width, height });

  for(let i = 0;i<sites.length;i++) {
    let url = sites[i];
    if(problems.indexOf(url) === -1) {
      console.log(url)

      let result = await new Promise(async resolve => {
        await page.goto(url);
        let body = await page.content();

        data = extractor(body.replace(/\./g,'. '), 'en');  
        // console.log(data.text)
        results = readabilityScores(data.text, {onlyARI: true})
        resolve(results)
      })
      
      let domain = dirName(url);
      let d = new Date();
      let currentMonth = d.getMonth()+1;
      if(currentMonth < 10) {
        currentMonth = '0'+currentMonth.toString();
      }
      let dirs = `../../data/${domain}/${d.getFullYear()}-${currentMonth}-${d.getDate()}`;

      fs.mkdirSync(dirs, { recursive: true });
      fs.writeFileSync(dirs+'/readability.json',JSON.stringify(result),'utf8')
      console.log(result)
      console.log('did '+url)
    }
  }

  browser.close()
}


let sites = JSON.parse(fs.readFileSync('../sites.json')).sites;
// let sites = [];
let agencies = JSON.parse(fs.readFileSync('../agencies.json')).Data;
agencies.forEach(agency => {
  sites.push(agency.WebsiteURL);
})
let problems = [];

rockit()
