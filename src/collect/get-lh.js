const fs = require('fs');
const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');

const chromeLauncher = require('chrome-launcher');
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');
const request = require('request');
const util = require('util');
const dirName = require('./dirname.js');

const options = {
  logLevel: 'info',
  disableDeviceEmulation: true,
  chromeFlags: ['--disable-mobile-emulation']
};

async function lighthouseFromPuppeteer(url, options, config = null) {
  // Launch chrome using chrome-launcher
  const chrome = await chromeLauncher.launch(options);
  options.port = chrome.port;

  // Connect chrome-launcher to puppeteer

  const resp = await util.promisify(request)(`http://localhost:${options.port}/json/version`);
  const { webSocketDebuggerUrl } = JSON.parse(resp.body);
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });

  // Run Lighthouse
  const { warmup } = await lighthouse(url, options, config);

  const { lhr } = await lighthouse(url, options, config);
  await browser.disconnect();
  await chrome.kill();


  const json = reportGenerator.generateReport(lhr, 'json');
  return json;
}

async function rockit() {
  for(let i = 0;i<sites.length;i++) {
    let url = sites[i];
    let result = await lighthouseFromPuppeteer(url, options);

    let domain = dirName(url);
    
    let d = new Date();
    let currentMonth = d.getMonth()+1;
    if(currentMonth < 10) {
      currentMonth = '0'+currentMonth.toString();
    }
    let dirs = `../../data/${domain}/${d.getFullYear()}-${currentMonth}-${d.getDate()}`;
  
    fs.mkdirSync(dirs, { recursive: true });
    fs.writeFileSync(dirs+'/lighthouse.json',result,'utf8')
    console.log('did '+url)
    
  }
}

let sites = JSON.parse(fs.readFileSync('./sites.json')).sites;
// let sites = [];
let agencies = JSON.parse(fs.readFileSync('./agencies.json')).Data;
agencies.forEach(agency => {
  sites.push(agency.WebsiteURL);
})

rockit()
  

