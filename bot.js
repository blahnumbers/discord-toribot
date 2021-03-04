const Discord = require('discord.js');
const tBot = require('./bot-functions');
const auth = require('./auth.json');
const defs = require('./defines.json');

const client = new Discord.Client();

let ignoreList = [];
let ignoreWarned = [];
let invCachedUsers = [];
let invCachedInfo = [];

let autoBroadcastChannels = ['385913484392529922'];

client.on('ready', () => {
	console.log('Connected');
	console.log('Logged in as: ' + client.user.username + ' (id ' + client.user.id + ')');
	client.user.setActivity('Toribash | -help', { type: "PLAYING" });
});

client.on('message', msg => {
	//console.log('Got message in ' + msg.channel.id);
	if (autoBroadcastChannels.indexOf(msg.channel.id + '') !== -1) {
		if (msg.crosspostable) {
			console.log('Got a crosspostable message in #' + msg.channel.name + ': ' + msg.content);
			msg.crosspost().then(() => console.log('Crossposted message from #' + msg.channel.name));
		}
	}
	if (msg.author.bot) {
		return;
	}
	let message = msg.content;
	let userMessage = msg;
	if (message.toLowerCase() == 'love me senpai') {
		msg.react('❤');
	}
	if (message.toLowerCase().search(/\bele\b/gm) != -1) {
		let xzibit = client.emojis.find(emoji => emoji.name === 'xzibit');
		if (xzibit) {
			msg.react(xzibit);
		}
	}
	if (message.substring(0, 1) == defs.COMMAND_PREFIX) {
		let args = message.substring(1).split(' ');
		let cmd = args[0].toLowerCase();
		let username, index, page, stackid, invid;
		let ignore = true;
		if (ignoreList.indexOf(msg.author.id) !== -1) {
			console.log('Ignoring user ' + msg.author.id);
			if (ignoreWarned.indexOf(msg.author.id) === -1) {
				if (userMessage.channel.type == 'dm') {
					msg.reply('Hey, chill! Wait out a few seconds before running new commands.');
				} else {
					msg.reply('chill! Wait out a few seconds before running new commands.');
				}
				ignoreWarned.push(msg.author.id);
				setTimeout(function() {
					let index = ignoreWarned.indexOf(msg.author.id);
					if (index !== -1) ignoreWarned.splice(index, 1);
				}, 60000);
			} else if (userMessage.channel.type != 'dm') {
				userMessage.delete();
			}
			return;
		}

		args = args.splice(1);
		switch (cmd) {
			case 'tc':
			case 'toricredits':
				username = args[0];
				if (typeof username == 'undefined') {
					tBot.sendUsernameMissingError(msg, userMessage);
					return;
				}
				msg.channel.send({
					embed: {
						title: 'Fetching TC balance for ' + username,
						description: 'Please wait...'
					}
				})
					.then(msg => tBot.getUserTcBalance(username, function(message, err) {
						msg.edit(message);
						if (err) {
							setTimeout(function() {
								msg.delete();
								userMessage.delete();
							}, 5000)
						}
					}));
				break;
			case 'info':
			case 'information':
				username = args[0];
				if (typeof username == 'undefined') {
					tBot.sendUsernameMissingError(msg, userMessage);
					return;
				}
				msg.channel.send({
					embed: {
						title: 'Fetching information about ' + username,
						description: 'Wait a moment...'
					}
				})
					.then(msg => tBot.getUserInfo(username, function(message, err) {
						msg.edit(message);
						if (err) {
							setTimeout(function() {
								msg.delete();
								userMessage.delete();
							}, 5000)
						}
					}));
				break;
			case 'inv':
			case 'inventory':
				username = args[0];
				let mode = args[1];
				if (mode == 'a' || mode == 'act' || mode == 'active') {
					mode = 2;
				} else if (mode == 'd' || mode == 'de' || mode == 'deactive') {
					mode = 1;
				} else if (mode == 'm' || mode == 'mt' || mode == 'market') {
					mode = 3;
				} else {
					mode = 0;
				}
				if (typeof username == 'undefined') {
					tBot.sendUsernameMissingError(msg, userMessage);
					return;
				}
				msg.channel.send({
					embed: {
						title: 'Fetching ' + username + '\'s inventory',
						description: 'This will take a few seconds...'
					}
				})
					.then(msg => tBot.getUserInventoryInfo(username, mode, function(message, reply, invinfo, err) {
						if (userMessage.channel.type == 'dm') {
							if (!err && reply) {
								msg.edit(reply);
							} else {
								msg.edit(message);
							}
						} else {
							msg.edit(message);
							if (err) {
								setTimeout(function() {
									msg.delete();
									userMessage.delete();
								}, 5000);
							} else {
								userMessage.author.createDM()
									.then(chnl => chnl.send(reply));
							}
						}
						if (!err && invinfo) {
							let index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
							if (index == -1) {
								let timeoutFunc = setTimeout(function() {
									let index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
									if (index !== -1) {
										invCachedUsers.splice(index, 1);
										invCachedInfo.splice(index, 1);
									}
								}, defs.INV_CACHE_RESET_TIMER);
								invCachedUsers.push({ id: userMessage.author.id, func: timeoutFunc });
								invCachedInfo.push(invinfo);
							} else {
								invCachedInfo[index] = invinfo;
								clearTimeout(invCachedUsers[index].func);
								let newTimeout = setTimeout(function() {
									let index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
									if (index !== -1) {
										invCachedUsers.splice(index, 1);
										invCachedInfo.splice(index, 1);
									}
								}, defs.INV_CACHE_RESET_TIMER);
								invCachedUsers[index].func = newTimeout;
							}
						}
					}));
				break;
			case 'invpg':
			case 'invpage':
			case 'inventorypage':
				page = parseInt(args[0]);
				index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
				if (index !== -1) {
					if (userMessage.channel.type == 'dm') {
						msg.channel.send(tBot.printInventoryPage(invCachedInfo[index], page));
					} else {
						userMessage.author.createDM()
							.then(chnl => chnl.send(tBot.printInventoryPage(invCachedInfo[index], page)));
					}
					clearTimeout(invCachedUsers[index].func);
					let newTimeout = setTimeout(function() {
						let index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
						if (index !== -1) {
							invCachedUsers.splice(index, 1);
							invCachedInfo.splice(index, 1);
						}
					}, defs.INV_CACHE_RESET_TIMER);
					invCachedUsers[index].func = newTimeout;
				} else {
					msg.channel.send(tBot.inventoryUserNotCachedError());
					ignore = false;
				}
				break;
			case 'invall':
				index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
				if (index !== -1) {
					let totalPages = Math.ceil(invCachedInfo[index].itemstotal / defs.INV_ITEMS_PER_PAGE);
					for (let i = 1; i <= totalPages; i++) {
						if (userMessage.channel.type == 'dm') {
							msg.channel.send(tBot.printInventoryPage(invCachedInfo[index], i));
						} else {
							userMessage.author.createDM()
								.then(chnl => chnl.send(tBot.printInventoryPage(invCachedInfo[index], i)));
						}
					}
					clearTimeout(invCachedUsers[index].func);
					let newTimeout = setTimeout(function() {
						let index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
						if (index !== -1) {
							invCachedUsers.splice(index, 1);
							invCachedInfo.splice(index, 1);
						}
					}, defs.INV_CACHE_RESET_TIMER);
					invCachedUsers[index].func = newTimeout;
				} else {
					msg.channel.send(tBot.inventoryUserNotCachedError());
					ignore = false;
				}
				break;
			case 'invinf':
			case 'invinfo':
			case 'inventoryinfo':
				invid = parseInt(args[0]);
				stackid = parseInt(args[1]);
				stackid = isNaN(stackid) ? null : stackid;
				index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
				if (index !== -1) {
					if (userMessage.channel.type == 'dm') {
						msg.channel.send(tBot.printInventoryItemInfo(invCachedInfo[index], invid, stackid));
					} else {
						userMessage.author.createDM()
							.then(chnl => chnl.send(tBot.printInventoryItemInfo(invCachedInfo[index], invid, stackid)));
					}
					clearTimeout(invCachedUsers[index].func);
					let newTimeout = setTimeout(function() {
						let index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
						if (index !== -1) {
							invCachedUsers.splice(index, 1);
							invCachedInfo.splice(index, 1);
						}
					}, defs.INV_CACHE_RESET_TIMER);
					invCachedUsers[index].func = newTimeout;
				} else {
					msg.channel.send(tBot.inventoryUserNotCachedError());
					ignore = false;
				}
				break;
			case 'invexp':
			case 'invexpand':
			case 'inventoryexpand':
				stackid = parseInt(args[0]);
				page = parseInt(args[1]);
				page = isNaN(page) ? 1 : page;
				index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
				if (index !== -1) {
					if (userMessage.channel.type == 'dm') {
						msg.channel.send(tBot.printInventoryExpandedPage(invCachedInfo[index], stackid, page));
					} else {
						userMessage.author.createDM()
							.then(chnl => chnl.send(tBot.printInventoryExpandedPage(invCachedInfo[index], stackid, page)));
					}
					clearTimeout(invCachedUsers[index].func);
					let newTimeout = setTimeout(function() {
						let index = invCachedUsers.findIndex(function(element) { return element.id == userMessage.author.id });
						if (index !== -1) {
							invCachedUsers.splice(index, 1);
							invCachedInfo.splice(index, 1);
						}
					}, defs.INV_CACHE_RESET_TIMER);
					invCachedUsers[index].func = newTimeout;
				} else {
					msg.channel.send(tBot.inventoryUserNotCachedError());
					ignore = false;
				}
				break;
			case 'swansong':
				msg.channel.send('https://www.youtube.com/watch?v=rBfHhFKZ2iU');
				break;
			case 'yourattempts':
				username = typeof args[0] == "undefined" ? 'itemp' : args[0];
				msg.channel.send(username + ", your attempts to sound witty and sarcastic are laughable - talking is not your strong suit, and it looks all the more weak when you're almost choking on your own venom(which seems to usually happen in my presence). Your words have no meaning, because you're only imitating. You're shallow, hypocritical and spiteful. So take my not very friendly, but genuine advice: you'd do yourself a favor if you talked less, because it would mean less opportunities for you to embarass yourself");
				break;
			case 'help':
			case 'halp':
				msg.channel.send(tBot.printHelp());
				break;
			default:
				ignore = false;
				break;
		}
		if (ignore) {
			ignoreList.push(msg.author.id);
			setTimeout(function() {
				let index = ignoreList.indexOf(msg.author.id);
				if (index !== -1) ignoreList.splice(index, 1);
			}, defs.COMMAND_DELAY);
		}
	}
});

client.login(auth.token);
