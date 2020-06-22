const PerfLeaderboard = require("performance-leaderboard");

(async function() {

	let urls = [
		"https://covid19.ca.gov/"
	];

	/*
	,
		"https://alpha.ca.gov/",
		"https://unemployment.edd.ca.gov/guide/benefits"
		*/

	console.log( await PerfLeaderboard(urls, 1) );
})();