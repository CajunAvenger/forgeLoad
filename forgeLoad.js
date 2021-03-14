var cards = require('./msem/cards.json');
var setData = require('./msem/setData.json');
var fs = require('fs');
var mkdirp = require('mkdirp');
var getDirName = require('path').dirname;
var download = require('download-file');
var cardList = Object.keys(cards);
var i = 0;
var fails = 0;
var dfcCorrect = false;
var generateSkeletons = true;
var generateImages = true;
var generateEditions = true;
var specified = false;
var portedSets = [];

if(process.argv[2] != undefined) {
	if(process.argv.includes('-dfc')) //only export dfcs
		dfcCorrect = true;
	//export all if no argvs
	//export argvs only if argvs
	if(process.argv.includes('-f') || process.argv.includes('-e') || process.argv.includes('-i')) {
		generateSkeletons = false;
		generateImages = false;
		generateEditions = false;
	}
	if(process.argv.includes('-f')) //only export text files
		generateSkeletons = true;
	if(process.argv.includes('-i')) //only export card images
		generateImages = true;
	if(process.argv.includes('-e')) //only export edition files
		generateEditions = true;

	for(let arg in process.argv) { //only export specific sets
		if(process.argv[arg].match(/^-?[A-Z0-9_]+$/)) {
			portedSets.push(process.argv[arg].replace(/^-/, ""));
		}
	}
	let restartIndex = process.argv.indexOf('-r');
	if(restartIndex >= 0)
		i = process.argv[restartIndex+1]
}

function writeFile(path, contents, cb) {
	mkdirp(getDirName(path), function (err) {
		if (err) return cb(err);
		fs.writeFile(path, contents, cb);
	});
}
function pullTokenSet(card, setbase) { //determines what set a token belongs to
	for(let set in setbase) {
		if(card.cardID.match(set))
			return set;
		if(card.setID.match(set))
			return set;
		
	}
	return "MSEMAR";
}
function lackeyColorCondenser (swath) { //condenses card colors down to Lackey color
	if(!swath)
		return "";
	var someColors = "";
	if(swath.match("White"))
		someColors += "W";
	if(swath.match("Blue"))
		someColors += "U";
	if(swath.match("Black"))
		someColors += "B";
	if(swath.match("Red"))
		someColors += "R";
	if(swath.match("Green"))
		someColors += "G";
	someColors = someColors.toLowerCase();
	switch(someColors) {
		case 'wr':
			someColors = 'rw';
			break;
		case 'wg':
			someColors = 'gw';
			break;
		case 'ug':
			someColors = 'gu';
			break;
		default:
			break;
	}
	return someColors;
}
function errHandler(errCount) {
	i--;
	if(errCount < 5) {
		console.log('Encounted an error at card ' + cardList[i] + ', attempting to fix.');
		setTimeout(function() {
			downloadCard(errCount+1);
		}, 1000)
	}else if(fails > 2){
		console.log('There appears to be an issue with the site, download halted at card ' + i + ': ' + cardList[i]);
		console.log('The next time you run forgeLoad, include the tag \'-r ' + i + '\' without quotes to start downloading from this card.');
	}else{
		console.log('Encounted continuous errors at card ' + cardList[i] + ', skipping it.');
		i++;
		downloadCard(0);
	}
}
function forgeTokenName(card) {
	let tokenName = lackeyColorCondenser(card.color);
	if(tokenName != "")
		tokenName += "_";
	if(card.power)
		tokenName += card.power + "_" + card.toughness + "_";
	tokenName += card.cardName += "_";
	tokenName += pullTokenSet(card, setData);
	tokenName = tokenName.toLowerCase();
	return tokenName;
}
function forgeSkeletonWriter(card) {
	let finished = false;
	let skele = "";
	skele += "Name:" + card.cardName;
	skele += "\nManaCost:"+forgeMana(card.manaCost);
	skele += "\nTypes:"+card.typeLine.replace(/ —/g, "");
	if(card.power != "") {
		skele += "\nPT:" + card.power + "/" + card.toughness;
	}else if(card.loyalty != "") {
		skele += "\nLoyalty:" + card.loyalty;
	}
	let abils = forgeAbilities(card.rulesText, card.cardName);
	skele += "\n" + abils[0];
	finished = abils[1]; //if it's vanilla or french
	skele += "Oracle:";
	if(card.rulesText != "" && card.rulesText != "\n")
		skele += card.rulesText.replace(/\n/g, "\\n").replace(/\*/g, "");
	if(card.shape == "doubleface" || card.shape == "split") {
		skele += "\n\nALTERNATE\n\n";
		skele += "Name:" + card.cardName;
		skele += "\nManaCost:"+forgeMana(card.manaCost2);
		skele += "\nTypes:"+card.typeLine2.replace(/—/g, "");
		skele += "\nTypes:"+card.typeLine2.replace(/—/g, "");
		if(card.power != "") {
			skele += "\nPT:" + card.power2 + "/" + card.toughness2;
		}else if(card.loyalty != "") {
			skele += "\nLoyalty:" + card.loyalty2;
		}
		abils = forgeAbilities(card.rulesText2, card.cardName2)
		skele += "\n" + abils[0];
		finished = false; //all of them will need some other coding done
		skele += "Oracle:" + card.rulesText2.replace(/\n/g, "\\n").replace(/\*/g, "");
	}
	return [skele, finished];
}
function forgeAbilities(cardText, cardName) {
	let finished = true;
	let trimmedText = cardText.replace(/\([^)]+\)/g, "");
	if(trimmedText == "" || trimmedText == "\n")
		return ["", true];
	let CARDNAME = new RegExp(cardName, 'g');
	trimmedText = trimmedText.replace(CARDNAME, "CARDNAME");
	let output = "";
	let sentences = trimmedText.split('\n')
	let bigListOfKeywords = "deathtouch|defender|double strike|first strike|flying|flash|hexproof|haste|lifelink|menace|persist|prowess|reach|trample|vigilance|CARDNAME can't be blocked\\.|CARDNAME enters the battlefield tapped\\.|CARDNAME can't block\\.|CARDNAME can't attack or block alone\\.|CARDNAME attacks each combat if able\\.|CARDNAME attacks each turn if able\\."
	let keywordRegex = new RegExp('^((' + bigListOfKeywords + ')(, )?)+$', 'i');
	let keywordPull = new RegExp('('+bigListOfKeywords+')', 'ig')
	for(let line in sentences) {
		if(sentences[line].match(keywordRegex)) {
			let hits = sentences[line].match(keywordPull);
			for(let hit in hits) {
				output += "K:" + convertKeywords(hits[hit]) + "\n";
			}
		}else{
			finished = false;
		}
	}
	return [output, finished];
}
function convertKeywords(word) {
	if(word == "CARDNAME can't be blocked.")
		return "Unblockable";
	if(word == "CARDNAME can't block or be blocked.")
		return "Unblockable\nK:CARDNAME can't block.";
	if(word.match("CARDNAME"))
		return word;
	return toTitleCase(word);
}
function toTitleCase(str) { // changes string To Title Case
	return str.replace(
		/\w\S*/g,
		function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		}
	);
}
function forgeMana(cost) {
	cost = cost.replace(/}{/g, " "); //spaces between symbols
	cost = cost.replace(/[{}]/g, ""); //remove leading/trailing brackets
	cost = cost.replace(/\//g, ""); //remove hybrid slashes
	return cost;
}
function genEditionFiles() {
	let hold = {};
	let holdS = {};
	for(let card in cards) {
		let go = false
		if(portedSets.length && portedSets.includes(cards[card].setID))
			go = true;
		if(!portedSets.length && cards[card].setID != "tokens" && !setData[cards[card].setID].priceSkip)
			go = true;
		if(go) {
			let set = cards[card].setID;
			if(!hold.hasOwnProperty(set))
				hold[set] = [];
			let num = cards[card].cardID;
			if(num.match(/s/)) {
				num = num.replace(/s/, "");
				if(!holdS.hasOwnProperty(set))
					holdS[set] = [];
				holdS[set][num] = card;
			}else{
				hold[set][num] = card;
			}
		}
	}
	for(let set in hold) {
		let header = `[metadata]\n`;
		header += `Code=${set}\n`;
		header += `Date=${setData[set].releaseDate}\n`;
		header += `Name=MSEM: ${setData[set].longname}\n`;
		header += `Type=Other\n`;
		header += `Booster=10 Common, 3 Uncommon, 1 RareMythic, 1 BasicLand\n\n`;
		header += `[cards]\n`;
		for(let i=0; i<= hold[set].length; i++) {
			if(hold[set][i])
				header += `${i} ${cards[hold[set][i]].rarity.substring(0,1).toUpperCase().replace("B", "S")} ${cards[hold[set][i]].cardName}\n`;
		}
		if(holdS[set]) {
			for(let i=0; i<= holdS[set].length; i++) {
				if(holdS[set][i])
					header += `${i}s ${cards[holdS[set][i]].rarity.substring(0,1).toUpperCase().replace("B", "S")} ${cards[holdS[set][i]].cardName}\n`;
			}
		}
		header += "\n[tokens]\n";
		writeFile(`./editions/${set}.txt`, header, function(err) {
			if(err)
				throw err;
			console.log(`editions/${set} written.`);
		})
	}
}
function downloadCard(errCount) {
	if(i == cardList.length) {
		console.log('Done!');
		return;
	}
	card = cardList[i];
	i++;
	let isSkipped = false;
	if(portedSets.length) {
		isSkipped = true;
		while(isSkipped == true) {
			if(cards[card].setID != "tokens") {
				if(!portedSets.includes(cards[card].setID)) {
					isSkipped = true;
					i++;
					card = cardList[i];
				}else{
					isSkipped = false;
				}
			}else{
				if(!portedSets.includes(pullTokenSet(cards[card], setData))) {
					isSkipped = true;
					i++;
					card = cardList[i];
				}else{
					isSkipped = false;
				}
			}
			if(i == cardList.length) {
				console.log('Done!');
				return;
			}
		}	
	}
	if(cards[card].setID == "BOT" || (dfcCorrect && cards[card].shape != "doubleface") || (isSkipped)) {
		downloadCard(0); //continue to next card
	}else{
		if(generateSkeletons) {
			let skeleName = card.replace(/_.+/, "").replace(/ /g, "_").replace(/\/\//g, "_").replace(/[-,\?!]/g, "").toLowerCase();
			let skeleData = forgeSkeletonWriter(cards[card]);
			let dir = "/" + pullTokenSet(cards[card], setData) + "/";
			if(!skeleData[1]) {
				dir = "./skeletons" + dir;
			}else{
				dir = "./completed" + dir;
			}
			writeFile(dir + skeleName+'.txt', skeleData[0].replace(/\n/g, "\r\n"), function(e){if (e) console.log(e)});
		}
		if(generateImages) {
			let extension = cards[card].setID + "/" + cards[card].cardID;
			let downloadLink = "http://mse-modern.com/msem2/images/" + extension + (cards[card].shape == "split" ? "b":"") + ".jpg";
			console.log("Downloading " + downloadLink);
			let dest = cards[card].fullName.replace(/\//g,"");
			if(cards[card].setID == "tokens")
				dest = forgeTokenName(cards[card]).replace(/\//g,"");
			if(cards[card].shape == "doubleface") {
				download(downloadLink.replace('.jpg', 'a.jpg'), {directory:"./images/"+cards[card].setID + "/", filename: cards[card].cardName+ ".full.jpg"}, function(err) {
					if(err) {
						errHandler(errCount);
					}else{
						download(downloadLink.replace('.jpg', 'b.jpg'), {directory:"./images/"+cards[card].setID + "/", filename: cards[card].cardName2+ ".full.jpg"}, function(err) {
							if(err) {
								errHandler(errCount);
							}else{
								fails = 0;
								downloadCard(0);
							}
						});
					}
				});
			}else if(cards[card].shape == "split") {
				download(downloadLink, {directory:"./images/"+ cards[card].setID + "/", filename: dest+ ".full.jpg"}, function(err) {
					if(err) {
						errHandler(errCount);
					}else{
						fails = 0;
						downloadCard(0);
					}
				});
			}else if(cards[card].setID == "tokens") {
				download(downloadLink, {directory:"./images/tokens", filename: dest+ ".jpg"}, function(err) {
					if(err) {
						errHandler(errCount);
					}else{
						fails = 0;
						downloadCard(0);
					}
				});
			}else{
				download(downloadLink, {directory:"./images/"+ cards[card].setID + "/", filename: dest+ ".full.jpg"}, function(err) {
					if(err) {
						errHandler(errCount);
					}else{
						fails = 0;
						downloadCard(0);
					}
				});
			}
		}else{
			fails = 0;
			downloadCard(0);
		}
	}
}
if(generateEditions)
	genEditionFiles();
if(generateImages || generateSkeletons)
	downloadCard(0)