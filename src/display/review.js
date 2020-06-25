const fs = require('fs')
let noRead = 0;
let yesRead = 0;
let unreaddomains = []
let reports = [];

let refs = JSON.parse(fs.readFileSync('./refs.json','utf8'))
function calculatePerf(audit) {
  let perfScore = 0;
  refs.categories.performance.auditRefs.forEach(ref => {
    if(ref.weight !== 0) {
      perfScore += audit.audits[ref.id].score * ref.weight;
    }
  })
  return perfScore;
}
function calculateA11y(audit) {
  let score = 0;
  let possible = 0;
  refs.categories.accessibility.auditRefs.forEach(ref => {
    if(ref.weight !== 0) {
      possible += ref.weight;
      score += audit.audits[ref.id].score * ref.weight;
    }
  })
  return parseInt((score/possible) * 100);
}

let sites = JSON.parse(fs.readFileSync('../sites.json')).sites;
let agencies = JSON.parse(fs.readFileSync('../agencies.json')).Data;
agencies.forEach(agency => {
  sites.push(agency.WebsiteURL);
})

sites.forEach(url => {
  let domain = url.split('//')[1].split('/')[0];
  let reportObj = {};
  reportObj.domain = domain;
  reportObj.url = url;
  let lighthouse = fs.existsSync(`../../data/${domain}/2020-6-22/lighthouse.json`);
  let readFile = `../../data/${domain}/2020-6-22/readability.json`;
  let readability = fs.existsSync(readFile);
  let readScore;
  if(readability) {
    let readInfo = fs.readFileSync(readFile,'utf8')
    if(readInfo !== 'undefined') {
      readScore = JSON.parse(readInfo);
      if(readScore) {
        if(readScore.ari) {
          reportObj.readability = readScore.ari;
        }
      }
    }
  }
  if(lighthouse) {
    let lightData = JSON.parse(fs.readFileSync(`../../data/${domain}/2020-6-22/lighthouse.json`,'utf8'))
    reportObj.perf = calculatePerf(lightData);
    reportObj.a11y = calculateA11y(lightData);
  }
  if(lighthouse && readScore) {
    reports.push(reportObj)
  }

})

fs.writeFileSync('./reports.json',JSON.stringify(reports),'utf8');



