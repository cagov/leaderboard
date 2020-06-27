
const fs = require('fs');

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });
}

let dirPath = __dirname.replace('src','data');
let dirs = getDirectories(dirPath);
dirs.forEach(dir => {
  if(fs.existsSync(dirPath+'/'+dir+'/2020-06-26}')) {
    if(!fs.existsSync(dirPath+'/'+dir+'/2020-06-26')) {
      fs.mkdirSync(dirPath+'/'+dir+'/2020-06-26');
    }
    fs.renameSync(dirPath+'/'+dir+'/2020-06-26}/readability.json', dirPath+'/'+dir+'/2020-06-26/readability.json')
    // fs.unlinkSync(dirPath+'/'+dir+'/2020-06-26}')
  }
})
