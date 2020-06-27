const fs = require('fs')
let noRead = 0;
let yesRead = 0;
let unreaddomains = []
let reports = [];

let refs = JSON.parse(fs.readFileSync('./refs.json','utf8'))
function calculatePerf(audit, url) {
  let perfScore = 0;
  refs.categories.performance.auditRefs.forEach(ref => {
    if(ref.weight !== 0) {
      perfScore += audit.audits[ref.id].score * ref.weight;
    }
  })
  return perfScore;
}
function calculateA11y(audit, url) {
  let score = 0;
  let possible = 0;
  refs.categories.accessibility.auditRefs.forEach(ref => {
    if(ref.weight !== 0) {
      if(audit.audits[ref.id].scoreDisplayMode !=  'notApplicable') {
        possible += ref.weight;
        score += audit.audits[ref.id].score * ref.weight;  
      }
    }
  })
  return parseInt((score/possible) * 100);
}

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });
}

let dirPath = __dirname.replace('src/display','data');
let dirs = getDirectories(dirPath);
dirs.forEach(dir => {
  let insideDirs = getDirectories(dirPath +'/'+ dir);
  let lighthouse = null;
  let readability = null;
  insideDirs.forEach(insideDir => {
    let filePath = dirPath +'/'+dir + '/' + insideDir;
    console.log(filePath)
    if(fs.existsSync(filePath+'/'+'readability.json')) {
      console.log('found redability')
      readability = fs.readFileSync(filePath+'/'+'readability.json','utf8');
    }
    if(fs.existsSync(filePath+'/'+'lighthouse.json')) {
      console.log('found lighthouse')
      lighthouse = fs.readFileSync(filePath+'/'+'lighthouse.json','utf8');
    }
  })
  // console.log(lighthouse)
  
  if(readability && lighthouse) {
    writeReport(readability, lighthouse)
  }
  // get latest date directory
  // see if it has both lighthouse and readability.json
})


function writeReport(readInfo,lighthouse) {
  
  let reportObj = {};  
  let readScore;
  readScore = JSON.parse(readInfo);
  if(readScore) {
    if(readScore.ari) {
      reportObj.readability = readScore.ari;
    }
  }
  let lightData = JSON.parse(lighthouse);
  reportObj.url = lightData.finalUrl;
  reportObj.perf = calculatePerf(lightData, reportObj.url);
  reportObj.a11y = calculateA11y(lightData, reportObj.url);
  if(reportObj.perf && reportObj.a11y) {
    reports.push(reportObj)
  }
}

fs.writeFileSync('./reports.json',JSON.stringify(reports),'utf8');



