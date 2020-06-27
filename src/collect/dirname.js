module.exports = function dirName(url) {
  let domain = url.split('//')[1].split('/')[0];
  let uri = url.split(domain)[1];
  if(uri.length > 1 && uri.substr(1,uri.length - 1).indexOf('/') > -1) {
    domain += uri.replace(/\//g,'-');
  }
  if(domain.charAt(domain.length-1) === '-') {
    domain = domain.slice(0,-1)
  }
  return domain;
}
