const puppeteer = require('puppeteer');
const fs = require('fs')
const extractor = require('unfluff');
var readabilityScores = require('readability-scores')


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
      
      let domain = url.split('//')[1].split('/')[0];
      let d = new Date();
      let dirs = `../../data/${domain}/${d.getFullYear()}-${d.getMonth()+1}-${d.getDate() - 2}`;

      fs.mkdirSync(dirs, { recursive: true });
      fs.writeFileSync(dirs+'/readability.json',JSON.stringify(result),'utf8')
      console.log(result)
      console.log('did '+url)
    }
  }

  browser.close()
}

/*
// let sites = JSON.parse(fs.readFileSync('./sites.json')).sites;
let sites = [];
let agencies = JSON.parse(fs.readFileSync('./agencies.json')).Data;
let go = false;
agencies.forEach(agency => {
  if(go) {
    sites.push(agency.WebsiteURL);
  }
  console.log(agency.WebsiteURL)
  if(agency.WebsiteURL == 'https://www.bpm.ca.gov/index.shtml') {
    go = true;
  }
})
*/

let problems = ['https://dds.ca.gov', 'https://www.calvet.ca.gov/VetServices/Pages/DVBE-Council.aspx', 'http://nahc.ca.gov', 'https://www.pac.ca.gov/', 'https://www.bpm.ca.gov/index.shtml', 'http://deltaconservancy.ca.gov/', 'https://calstate.edu', 'https://www.calvet.ca.gov/', 'https://www.calvet.ca.gov/Pages/California-Veterans-Board.aspx', ];


rockit()
