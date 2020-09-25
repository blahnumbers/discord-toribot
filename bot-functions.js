const request = require('request');
const Discord = require('discord.js');
const defs = require('./defines.json');

let formatter = new Intl.NumberFormat('en-US');
let getTimeDiff = function(t) {
	let dtNow = new Date();
	return Math.round((dtNow.getTime() - t * 1000) / 1000);
}
let unixTimestamp = function(t) {
	let dt = new Date(t * 1000);
	return dt.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}
let getLastTime = function(t, max) {
	let minutes = Math.floor(t / 60) % 60;
	let hours = Math.floor(t / 60 / 60) % 24;
	let days = Math.floor(t / 60 / 60 / 24);
	if (days > 31) {
		return false;
	} else {
		let lastTime = '';
		let count = 0;
		if (days > 0) {
			lastTime += days + ' days ';
			count++;
		}
		if (hours > 0 && count < max) {
			lastTime += hours + ' hours ';
			count++;
		}
		if (minutes > 0 && count < max) {
			lastTime += minutes + ' minutes ';
		}
		lastTime += 'ago';
		return lastTime;
	}
}
let printNumber = function(num) {
	num = '   ' + num;
	return '`' + num.substring(-4) + '`';
}

exports.sendUsernameMissingError = function(msg, userMessage) {
	msg.channel.send({
		embed: {
			title: 'What am I supposed to search, huh?',
			description: 'You have to enter player\'s name and not just the command!'
		}
	})
		.then(msg => function() {
			setTimeout(function() {
				msg.delete();
				userMessage.delete();
			}, 5000);
		});
}

exports.getUserTcBalance = function(username, reply) {
	request('https://forum.toribash.com/tori_api.php?action=user_tc&username=' + escape(username), { json: true }, (err, res, body) => {
		if (err || typeof body == 'undefined') {
			reply({
				embed: {
					description: ':interrobang: **Error fetching data for ' + username + '.**\n...are you sure that\'s the proper username?',
				}
			}, true);
			return;
		}

		let descr = 'It ain\'t much, but it\'s honest work.';
		if (body.tc < 1000) {
			descr = 'Somebody please give this man a coin!'
		}
		if (body.tc > 50000) {
			let forcePrices = [
				{ name: 'Alpha', price: 300000 },
				{ name: 'Aurora', price: 13500 },
				{ name: 'Azurite', price: 60000 },
				{ name: 'Demon', price: 240000 },
				{ name: 'Gold', price: 12000 },
				{ name: 'Knox', price: 450 },
				{ name: 'Magma', price: 105000 },
				{ name: 'Platinum', price: 42000 },
				{ name: 'Superior', price: 250000 },
				{ name: 'Vampire', price: 7500 },
				{ name: 'Warrior', price: 90000 }
			];
			let selectedForce = forcePrices[Math.floor(Math.random() * forcePrices.length)];
			descr = 'And can afford whole ' + Math.round(body.tc / selectedForce.price * 100) / 100 + ' ' + selectedForce.name + ' Forces with that!';
		}
		if (body.tc > 1000000) {
			descr = 'Please report to authorities, they probably robbed ToriBank.';
		}
		if (body.username == 'ToriBot') {
			descr = 'Though actually, it has limitless TC.';
		}
		reply({
			embed: {
				title: body.username + ' has ' + formatter.format(body.tc) + ' Toricredits!',
				description: descr,
			}
		});
	});
}

exports.getUserInfo = function(username, reply) {
	request('https://forum.toribash.com/tori_api.php?action=user_stats&username=' + escape(username), { json: true }, (err, res, body) => {
		if (err || typeof body == 'undefined') {
			reply({
				embed: {
					description: ':interrobang: **Error fetching data for ' + username + '.**\n...are you sure that\'s the proper username?',
				}
			}, true);
			return;
		}

		let msgEmbed = new Discord.RichEmbed();
		msgEmbed.setTitle('Information about ' + body.username);
		msgEmbed.setDescription('[Profile on forums](https://forum.toribash.com/member.php?u=' + body.userid + ')');
		msgEmbed.setThumbnail('https://cache.toribash.com/forum/customavatars/avatar' + body.userid + '_' + body.avatarrevision + '.gif');
		if (body.belttitle) {
			body.belt = body.belttitle + ' Belt';
		}
		if (typeof body.st == 'undefined') {
			body.st = 0;
		}
		let msgFields = [
			{ name: 'Belt', value: body.belt, inline: true },
			{ name: 'Qi', value: formatter.format(body.qi), inline: true },
			{ name: 'Toricredits', value: formatter.format(body.tc) + ' TC', inline: true },
			{ name: 'Shiai Tokens', value: formatter.format(body.st) + ' ST', inline: true },
			{ name: 'Join Date', value: unixTimestamp(body.joindate), inline: true }
		];
		let lastForumActivity = getTimeDiff(body.lastactivity);
		if (lastForumActivity > 600) {
			let lastOnline = getLastTime(lastForumActivity, 2);
			if (!lastOnline) {
				msgFields.push({ name: 'Last Forum Activity', value: unixTimestamp(body.lastactivity), inline: true });
			} else {
				msgFields.push({ name: 'Last Forum Activity', value: lastOnline, inline: true });
			}
		} else {
			msgEmbed.setFooter('Online on forums', 'https://puu.sh/Gwhis/b5144b0056.png');
		}
		if (body.room) {
			if (msgEmbed.footer) {
				msgEmbed.footer.text += ' and in ' + body.room + ' room in game';
			} else {
				msgEmbed.setFooter('Online in ' + body.room + ' room in game', 'https://puu.sh/Gwhis/b5144b0056.png');
			}
		} else if (body.lastingame > 0) {
			let lastIngameActivity = getTimeDiff(body.lastingame);
			let lastOnline = getLastTime(lastIngameActivity, 2);
			if (!lastOnline) {
				msgFields.push({ name: 'Last Ingame Activity', value: unixTimestamp(body.lastingame), inline: true });
			} else {
				msgFields.push({ name: 'Last Ingame Activity', value: lastOnline, inline: true });
			}
		}
		if (body.clanid > 0) {
			msgFields.push({ name: 'Clan', value: '[' + body.clantag + ' ' + body.clanname + '](https://forum.toribash.com/clan.php?clanid=' + body.clanid + ')' });
		}
		msgFields.forEach(function(field) {
			msgEmbed.addField(field.name, field.value, field.inline);
		});
		if (body.isBanned) {
			msgEmbed.setFooter('This user is currently banned. Naughty!', 'https://puu.sh/GwhoY/e84b9ed9aa.png');
		}
		if (body.isAdmin || body.isMS || body.isES || body.isHS || body.isCS) {
			msgEmbed.setFooter('This user is a staff member', 'https://cache.toribash.com/forum/images/banana/bananalama.gif');
			//msgEmbed.setImage('https://cache.toribash.com/forum/customavatars/avatar5939996_3.gif');
		}
		if (body.isHS) {
			msgEmbed.setColor([150, 150, 150]);
		}
		if (body.isMS) {
			msgEmbed.setColor([0, 128, 0]);
		}
		if (body.isCS) {
			msgEmbed.setColor([0, 0, 0]);
		}
		if (body.isES) {
			msgEmbed.setColor([105, 0, 105]);
		}
		if (body.isSmod) {
			msgEmbed.setColor([0, 0, 255]);
		}
		if (body.isAdmin) {
			msgEmbed.setColor([255, 0, 0]);
		}
		reply({
			embed: msgEmbed
		})
	});
}

exports.getUserInventoryInfo = function(username, mode, reply) {
	request('https://forum.toribash.com/tori_api.php?action=user_inventory&mode=' + mode + '&username=' + escape(username), { json: true }, (err, res, body) => {
		if (err || typeof body != 'object') {
			reply({
				embed: {
					title: 'Error fetching data for ' + username + '.',
					description: '...are you sure that\'s the proper username?',
					thumbnail: {
						url: 'https://discordapp.com/assets/0756351ac9eb496a210cd591acecf1d0.svg'
					}
				}
			}, null, null, true);
			return;
		}
		
		let inventoryItems = [];
		for (let i = 0; i < body.itemstotal; i++) {
			let index = inventoryItems.findIndex(function(item) { return (item.itemid == body.inventory[i].itemid && item.itemid != 1458) });
			if (index !== -1) {
				// clean data that we already stored
				delete body.inventory[i]['itemid'];
				delete body.inventory[i]['itemname'];
				delete body.inventory[i]['description'];
				delete body.inventory[i]['image'];
				inventoryItems[index].items.push(body.inventory[i]);
				inventoryItems[index].count += 1;
			} else {
				let itemDescription = body.inventory[i].description == null ? '' : body.inventory[i].description;
				itemDescription = itemDescription.replace(/<\/?br\/?>/gm, '\n');
				itemDescription = itemDescription.replace(/<(?:.|\n)*?>/gm, '');
				let itemInfo = {
					itemid: body.inventory[i].itemid,
					itemname: body.inventory[i].itemname,
					description: itemDescription,
					image: body.inventory[i].image,
					items: [],
					count: 1
				}
				if (itemInfo.itemid == 1458) {
					itemInfo.setcontents = [];
					itemInfo.count = 0;
				}
				// clean some data not to store duplicates of it
				delete body.inventory[i]['itemid'];
				delete body.inventory[i]['itemname'];
				delete body.inventory[i]['description'];
				delete body.inventory[i]['image'];
				itemInfo.items.push(body.inventory[i]);
	
				if (body.inventory[i].setid == 0) {
					inventoryItems.push(itemInfo);
				} else {
					let setid = inventoryItems.findIndex(function(item) { return item.itemid == 1458 && item.items[0].inventid == body.inventory[i].setid });
					if (setid !== -1) {
						inventoryItems[setid].setcontents.push(itemInfo);
						inventoryItems[setid].count += 1;
					}
				}
			}
		}
		if (typeof body.inventory != 'undefined') {
			inventoryItems['username'] = body.username;
			inventoryItems['itemstotal'] = inventoryItems.length;
		}
		let pages = Math.ceil(inventoryItems.length / defs.INV_ITEMS_PER_PAGE);
		let invCmdDetails = '`' + defs.COMMAND_PREFIX + 'invpage [page]` - view inventory page';
		invCmdDetails += '\n`' + defs.COMMAND_PREFIX + 'invall` - view all inventory items at once';
		if (pages == 0) {
			reply({
				embed: {
					title: body.username + ' has no items!',
					description: 'What, not even a Chronos Grip???'
				}
			});
		} else if (pages == 1) {
			reply({
				embed: {
					title: body.username + ' has ' + body.itemstotal + ' items!',
					description: 'I\'ve DMed you with more details, yay!'
				}
			}, this.printInventoryPage(inventoryItems, 1), inventoryItems);
		} else {
			reply({
				embed: {
					title: body.username + ' has ' + body.itemstotal + ' items!',
					description: 'I\'ve DMed you with more details, yay!'
				}
			},
			{
				embed: {
					title: body.username + '\'s inventory information',
					description: '[View inventory on forums](https://forum.toribash.com/tori_inventory.php?userid=' + body.userid + '&sid=' + (mode > 0 ? (-mode + 1) : mode) + ')',
					fields: [
						{ name: 'Total Items', value: body.itemstotal, inline: true },
						{ name: 'Pages', value: pages, inline: true },
						{ name: 'Commands to view inventory details', value: invCmdDetails }
					],
					footer: {
						text: 'Current session expires in 30 seconds'
					}
				}
			}, inventoryItems);
		}
	});
}

let printInventoryStackedItems = function(invinfo, invid, page) {
	if (invinfo[invid].items.length == 1) {
		return {
			embed: {
				title: invinfo.username + ' only has one ' + invinfo[invid].itemname + '!',
				description: 'You can use `' + defs.COMMAND_PREFIX + 'invinfo ' + (invid + 1) + '` to view its info though.'
			}
		}
	}
	let itemLookup = invinfo[invid].items;
	let items = [];
	for (let i = (page - 1) * defs.INV_ITEMS_PER_PAGE; i <= page * defs.INV_ITEMS_PER_PAGE && i < itemLookup.length; i++) {
		let item = itemLookup[i];
		item.stackid = i + 1;
		items.push(item);
	}
	let inventoryPageInfo = '';
	items.forEach(function(item) {
		inventoryPageInfo += printNumber(item.stackid) + ': ' + invinfo[invid].itemname;
		inventoryPageInfo += '\n';
	});
	return {
		embed: {
			title: invinfo.username + '\'s ' + invinfo[invid].itemname + 's' + (itemLookup.length > defs.INV_ITEMS_PER_PAGE ? (' page ( ' + page + ' of ' + Math.ceil(invinfo[invid].items.length / defs.INV_ITEMS_PER_PAGE) + ')') : ''),
			description: inventoryPageInfo,
			fields: [
				{
					name: 'Commands', value: '`' + defs.COMMAND_PREFIX + 'invinfo ' + (invid + 1) + ' id` to view stacked inventory item info'
				}
			],
			footer: {
				text: 'Current session expires in 30 seconds'
			}
		}
	}
}

let printInventorySetItems = function(invinfo, invid, page) {
	if (invinfo[invid].count < 1) {
		return 'That set doesn\'t have any items inside! There is nothing to show there!!! AAAAAAA!!!!!!!';
	}
	let itemLookup = invinfo[invid].setcontents;
	let items = [];
	for (let i = (page - 1) * defs.INV_ITEMS_PER_PAGE; i <= page * defs.INV_ITEMS_PER_PAGE && i < itemLookup.length; i++) {
		let item = itemLookup[i];
		item.stackid = i + 1;
		items.push(item);
	}
	let inventoryPageInfo = '';
	items.forEach(function(item) {
		inventoryPageInfo += printNumber(item.stackid) + ': ' + item.itemname;
		inventoryPageInfo += '\n';
	});
	return {
		embed: {
			title: 'Items inside ' + invinfo.username + '\'s ' + invinfo[invid].items[0].setname + ' set' + (invinfo[invid].count > defs.INV_ITEMS_PER_PAGE ? (' page ( ' + page + ' of ' + Math.ceil(invinfo[invid].count / defs.INV_ITEMS_PER_PAGE) + ')') : ''),
			description: inventoryPageInfo,
			fields: [
				{
					name: 'Commands', value: '`' + defs.COMMAND_PREFIX + 'invinfo ' + (invid + 1) + ' id` to view stacked inventory item info'
				}
			],
			footer: {
				text: 'Current session expires in 30 seconds'
			}
		}
	}
}

exports.printInventoryExpandedPage = function(invinfo, stackid, page) {
	if (isNaN(stackid)) {
		return 'You\'re trying to expand what exactly? I need a number!';
	}
	let invid = stackid - 1;
	if (invid < 0) {
		return 'That\'s not a correct item list number!\nHere are proper ones: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,... Should I continue?';
	}
	if (invinfo[invid].itemid == 1458) {
		return printInventorySetItems(invinfo, invid, page);
	} else {
		return printInventoryStackedItems(invinfo, invid, page);
	}
}

exports.printInventoryPage = function(invinfo, page) {
	if (isNaN(page)) {
		page = 1;
	}
	let pagesTotal = Math.ceil(invinfo.itemstotal / defs.INV_ITEMS_PER_PAGE);
	if (page > pagesTotal) {
		return invinfo.username + '\'s inventory doesn\'t have **that** many pages!';
	}
	if (page < 1) {
		return 'Are you trying to break me? Page numbers can only be positive numbers, baka!';
	}
	let items = [];
	for (let i = (page - 1) * defs.INV_ITEMS_PER_PAGE; i <= page * defs.INV_ITEMS_PER_PAGE && i < invinfo.itemstotal; i++) {
		let item = invinfo[i];
		item.cacheid = i + 1;
		items.push(item);
	}
	let inventoryPageInfo = '';
	items.forEach(function(item) {
		if (item.itemid == 1458) {
			inventoryPageInfo += printNumber(item.cacheid) + ': ' + item.itemname + ': ' + item.items[0].setname + ' (' + item.count + ' items)';
		} else {
			inventoryPageInfo += printNumber(item.cacheid) + ': ' + item.itemname;
			if (item.count > 1) {
				inventoryPageInfo += ' **[x' + item.count + ']**';
			}
		}
		inventoryPageInfo += '\n';
	});
	return {
		embed: {
			title: invinfo.username + '\'s inventory (page ' + page + ' of ' + pagesTotal + ')',
			description: inventoryPageInfo,
			fields: [
				{
					name: 'Commands', value: '`' + defs.COMMAND_PREFIX + 'invinfo id` to view inventory item info\n`' + defs.COMMAND_PREFIX + 'invexpand id` to expand sets or grouped items'
				}
			],
			footer: {
				text: 'Current session expires in 30 seconds'
			}
		}
	}
}

let printInventorySingleItemInfo = function(item, stackid) {
	let msgEmbed = new Discord.RichEmbed();
	let itemName = item.itemname;
	if (item.itemid == 1458) {
		itemName += ': ' + item.items[0].setname;
	}
	msgEmbed.addField('Item Name', itemName);
	if (item.description != '') {
		msgEmbed.addField('Item Description', item.description);
	}
	if (item.image.match(/.+\.[a-z]+/gm)) {
		msgEmbed.setThumbnail('https://cache.toribash.com/forum/torishop/images/items/' + item.image);
	}
	msgEmbed.addField('Games played', item.items[stackid].gamesplayed, true);
	if (typeof item.items[stackid].flameid !== 'undefined') {
		msgEmbed.addField('Flame Name', item.items[stackid].flamename, true);
		msgEmbed.addField('Flame ID', item.items[stackid].flameid, true);
		msgEmbed.addField('Flame For', item.items[stackid].bodypartname, true);
	}
	if (typeof item.items[stackid].objitem !== 'undefined') {
		let extra = [];
		if (typeof item.items[stackid].retexturable !== 'undefined') {
			extra.push('Can be retextured');
		}
		if (typeof item.items[stackid].level !== 'undefined') {
			extra.push('Can be upgraded');
			msgEmbed.addField('Item Level', item.items[stackid].level, true);
		}
		if (item.items[stackid].bodypartname) {
			msgEmbed.addField('Applied to', item.items[stackid].bodypartname, true);
		}
		if (extra.length > 0) {
			msgEmbed.addField('Extra features', extra.toString(), true);
		}
	}
	if (item.itemid == 1458) {
		msgEmbed.addField('Items inside', item.count == 0 ? 'Set is empty' : item.count, true);
	}
	msgEmbed.addField('Last used', item.items[stackid].lastused, true);
	return {
		embed: msgEmbed
	}
}

exports.printInventoryItemInfo = function(invinfo, invid, stackid) {
	let stackSet = stackid ? true : false;
	stackid = stackSet ? stackid : 1;
	if (invid < 1) {
		if (invid == 0) {
			return 'Software engineer much? Item numbers start from 1!';
		}
		return 'How can one have #' + invid + ' item, huh?';
	}
	if (invid > invinfo.itemstotal) {
		return invinfo.username + ' doesn\'t have that many items! He\'d probably be happy to do though.';
	}
	let item = invinfo[invid - 1];
	stackid = stackid - 1;
	if (stackid >= item.count || stackid < 0) {
		console.log('Stack ID has incorrect value, resetting to 0');
		stackid = 0;
	}
	if (item.itemid == 1458 && stackSet) {
		return printInventorySingleItemInfo(item.setcontents[stackid], 0);
	}
	return printInventorySingleItemInfo(item, stackid);
}

exports.inventoryUserNotCachedError = function() {
	return {
		embed: {
			title: 'Sorry, no inventory to show for you!',
			description: 'Load player\'s inventory using `' + defs.COMMAND_PREFIX + 'inv [username]` command to be able to view their items.'
		}
	}
}

exports.printHelp = function() {
	let msgEmbed = new Discord.RichEmbed();
	msgEmbed.setTitle('List of available commands');
	msgEmbed.setDescription('Command arguments are listed as [arg]. Optional arguments have ? prefix.');
	let commandsGeneral = '`' + defs.COMMAND_PREFIX + 'tc [username]` - view player\'s TC balance\n';
	commandsGeneral += '`' + defs.COMMAND_PREFIX + 'info [username]` - view info about a player\n';
	msgEmbed.addField('General info commands', commandsGeneral);
	let commandsInventory = '`' + defs.COMMAND_PREFIX + 'inv [username] ?[a|d|m]` - load player\'s inventory for viewing\n';
	commandsInventory += '`' + defs.COMMAND_PREFIX + 'invpg [page]` - view loaded inventory page\n';
	commandsInventory += '`' + defs.COMMAND_PREFIX + 'invall` - view all inventory pages at once\n';
	commandsInventory += '`' + defs.COMMAND_PREFIX + 'invinf [number]` - view inventory item info\n';
	commandsInventory += '`' + defs.COMMAND_PREFIX + 'invexp [number]` - view set items or expand stacked items\n';
	msgEmbed.addField('Inventory commands (will be DMed)', commandsInventory);
	msgEmbed.setFooter('Commands support shortened or longer versions. For example, ' + defs.COMMAND_PREFIX + 'inventorypage, ' + defs.COMMAND_PREFIX + 'invpage and ' + defs.COMMAND_PREFIX + 'invpg are same.');
	return {
		embed: msgEmbed
	}
}
