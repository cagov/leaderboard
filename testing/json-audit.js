const fs = require('fs');
const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');

const chromeLauncher = require('chrome-launcher');
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');
const request = require('request');
const util = require('util');

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
  const { lhr } = await lighthouse(url, options, config);
  await browser.disconnect();
  await chrome.kill();


  const csvaudit = reportGenerator.generateReport(lhr, 'csv');
  fs.writeFileSync('./audits2.csv',csvaudit,'utf8')

  /*
  const json = reportGenerator.generateReport(lhr, 'csv');

  const audits = JSON.parse(json).audits; // Lighthouse audits
  const first_contentful_paint = audits['first-contentful-paint'].displayValue;
  const total_blocking_time = audits['total-blocking-time'].displayValue;
  const time_to_interactive = audits['interactive'].displayValue;

  fs.writeFileSync('./audits.json',JSON.stringify(audits),'utf8')

  console.log(`\n
     Lighthouse metrics: 
     🎨 First Contentful Paint: ${first_contentful_paint}, 
     ⌛️ Total Blocking Time: ${total_blocking_time},
     👆 Time To Interactive: ${time_to_interactive}`);

     */
}

lighthouseFromPuppeteer("https://covid19.ca.gov", options);

/*
     Lighthouse metrics:
     🎨 First Contentful Paint: 2.2 s,
     ⌛️ Total Blocking Time: 10 ms,
     👆 Time To Interactive: 3.7 s


    Lighthouse metrics:
     🎨 First Contentful Paint: 3.5 s,
     ⌛️ Total Blocking Time: 620 ms,
     👆 Time To Interactive: 7.1 s
*/