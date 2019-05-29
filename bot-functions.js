const request = require('request');
const fetch = require('node-fetch');
const moment = require('moment');
const Discord = require('discord.js');
const defs = require('./defines.json');
const ats = require('array-to-sentence');

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
			description: 'You have to enter a player\'s name and not just the command!'
		}
	}).then(msg => function() {
			setTimeout(function() {
				msg.delete();
				userMessage.delete();
			}, 5000);
		});
}

exports.sendClanMissingError = function(msg, userMessage) {
	msg.channel.send({
		embed: {
			title: 'What am I supposed to search, huh?',
			description: 'You have to enter a clan\'s name and not just the command!'
		}
	}).then(msg => function() {
			setTimeout(function() {
				msg.delete();
				userMessage.delete();
			}, 5000);
		});
}

exports.getUserTcBalance = function(username, reply) {
	request('http://forum.toribash.com/tori_api.php?action=user_tc&username=' + escape(username), { json: true }, (err, res, body) => {
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

exports.getUserInfo = function(username, message) {
	let embed = new Discord.RichEmbed()
					.setTitle(`Fetching information about ${username}`)
					.setDescription('Wait a moment...');

	let sentMsg = message.channel.send(embed);

    request.get(`http://forum.toribash.com/tori_api.php?action=user_stats&username=${username}`, (err, resp, body) => {
		if (err && resp.statusCode !== 200) return message.channel.send('There was an error. Please try again.');
		
        let json = JSON.parse(body);

        let belt = json.belttitle === null ? 'No Belt Title' : json.belttitle.replace(/\^[0-9][0-9]/gm, '').trim();

        let ranks = [];

        json.isES ? ranks.push('Event Squad') : null;
        json.isMS ? ranks.push('Market Squad') : null;
        json.isHS ? ranks.push('Help Squad') : null;
        json.isCS ? ranks.push('Clan Squad') : null;
        json.isSmod ? ranks.push('Super Moderator') : null;
        json.isAdmin ? ranks.push('Administrator') : null;

        let otherInfo = `
• Staff: **${json.isES || json.isMS || json.isHS || json.isCS || json.isSmod || json.isAdmin ? `\\✔ | ${ranks.length > 1 ? 'Ranks' : 'Rank'}: ${ats(ranks)}` : '\\✘'}**
• Banned: **${json.isBanned ? '\\✔' : '\\✘'}**
• Ingame: **${json.room !== null ? `\\✔ | Room: ${json.room}` : '\\✘'}**
• Join Date: **${moment.unix(json.joindate).format('ddd MMM Do YYYY @ hh:mm:ssa')} | ${moment.unix(json.joindate).fromNow()}**`;


        let embed = new Discord.RichEmbed()
            .setTitle(`${json.username}`)
            .setColor('#ff1042')
			.setURL(`https://forum.toribash.com/member.php?u=${json.userid}`)
			.setThumbnail(`http://cache.toribash.com/forum/customavatars/avatar${json.userid}_${json.avatarrevision}.gif`)

            .addField(`Forum Information`, `
• Last Activity: **${moment.unix(json.lastactivity).format('ddd MMM Do YYYY @ hh:mm:ssa')} | ${moment.unix(json.lastactivity).fromNow()}**
• Posts: **${parseInt(json.posts).toLocaleString()}**
• Balance: **${parseInt(json.tc).toLocaleString()} TC**
• User ID: **${json.userid}**
• Clan ID: **${json.clanid !== -1 ? json.clanid : 'No Clan'}**`)

            .addField(`Other Information`, otherInfo)

            .addField(`Ingame Information`, `
• Last Activity: **${moment.unix(json.lastingame).format('ddd MMM Do YYYY @ hh:mm:ssa')} | ${moment.unix(json.lastingame).fromNow()}**
• QI: **${parseInt(json.qi).toLocaleString()}**
• Belt: **${json.belt}**
• Belt Title: **${belt}**
• Clan Name and Tag: **${json.clanname !== null ? `${json.clanname} ${json.clantag}` : 'No Clan'}**`);
		sentMsg.then(msg => {
			msg.edit(embed);
		});
    });
}

exports.getUserInventoryInfo = function(username, mode, reply) {
	request('http://forum.toribash.com/tori_api.php?action=user_inventory&mode=' + mode + '&username=' + escape(username), { json: true }, (err, res, body) => {
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
					description: '[View inventory on forums](http://forum.toribash.com/tori_inventory.php?userid=' + body.userid + '&sid=' + (mode > 0 ? (-mode + 1) : mode) + ')',
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
	if (item.itemid === 1458) {
		itemName += ': ' + item.items[0].setname;
	}
	msgEmbed.addField('Item Name', itemName);
	if (item.description != '') {
		msgEmbed.addField('Item Description', item.description);
	}
	if (item.image.match(/.+\.[a-z]+/gm)) {
		msgEmbed.setThumbnail('http://cache.toribash.com/forum/torishop/images/items/' + item.image);
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
	commandsGeneral += '`' + defs.COMMAND_PREFIX + 'wars [clan]` - view last 10 wars from specified clan\n';
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

exports.getWars = async function(clan, message) {
	clan = clan.replace(/\s/g, '%20');
	if (!clan) return message.channel.send('Uhh, could you provide a clan name next time?');
	
	let clans = {};
	let wars = [];
	let fightLog = '';

	let embed = new Discord.RichEmbed()
        .setColor('#ff1042')
		.setDescription('Retrieving data... This could take a few seconds.');
		
	let sentMsg = message.channel.send(embed);

	let json = await fetch(`http://forum.toribash.com/clan_war_json.php?do=get_wars&name=${clan}`).then(res => res.json());

    if (json.err === "Incorrect clanid") {
        embed.setDescription('Sorry, that clan does not exist. Are you sure you entered the correct name?')
        return sentMsg.then(msg => msg.edit(embed));
    }

    json = json.slice(0, 10);

    for (let i = 0; i < json.length; i++) {
        let c = await fetch(`http://forum.toribash.com/clan_war_json.php?do=get_war_info&warid=${json[i].warid}`).then(res => res.json());
        await wars.push(c);
    }

    let page = 1;

    let size = 1; let pages = [];
    for (let i = 0; i < wars.length; i += size) pages.push(wars.slice(i, i + size));
    
    let numberOfPages = Math.floor((wars.length + size - 1) / size);

	embed.setFooter(`Page: ${page}/${numberOfPages}`);
	
	sentMsg.then(async msg => {
        msg.edit(embed);

        embed.description = '';

        for (let i of pages[page - 1]) {
            let start = new Date(i.start_date);
            let end = new Date(i.end_date);

            let duration = `${moment.duration(end - start).hours()} ${moment.duration(end - start).hours() !== 1 ? 'hours' : 'hour'}, ${moment.duration(end - start).minutes()} minutes`;

            clans[parseInt(i.host_clan.clanid)] = i.host_clan.btag;
            clans[parseInt(i.opponent_clan.clanid)] = i.opponent_clan.btag;

            for (let match of i.games) fightLog += `${clans[match.winner.clan]} ${match.winner.name} BEAT ${match.loser.name} ${clans[match.loser.clan]}\n`;
            
            embed
                .addField('Host Clan Information', `• Tag + Name: **${i.host_clan.btag} ${i.host_clan.name}**\n• Clan ID: **${i.host_clan.clanid}**\n• Score: **${i.host_clan.score}**`, true).addField('Opponent Clan Information', `• Tag + Name: **${i.opponent_clan.btag} ${i.opponent_clan.name}**\n• Clan ID: **${i.opponent_clan.clanid}**\n• Score: **${i.opponent_clan.score}**`, true)    
                .addField('War Information', `• War ID: **${i.warid}**\n• Duration: **${duration}**\n• Total Rounds: **${i.games.length}**`, true)
                .addBlankField(true)
                .addField('War Fight Log', `\`\`\`${fightLog}\`\`\``, true);
        }

        await msg.edit(embed);

        await msg.react('⏪');
        await msg.react('❌');
        await msg.react('⏩');

        const backwardsFilter = (reaction, user) => reaction.emoji.name === '⏪' && user.id === message.author.id;
        const forwardsFilter = (reaction, user) => reaction.emoji.name === '⏩' && user.id === message.author.id; 
        const cancelFilter = (reaction, user) => reaction.emoji.name === '❌' && user.id === message.author.id; 
        
        const backwards = msg.createReactionCollector(backwardsFilter, { time: 60000 }); 
        const forwards = msg.createReactionCollector(forwardsFilter, { time: 60000 }); 
        const cancel = msg.createReactionCollector(cancelFilter, { time: 60000 });

        backwards.on('collect', async r => {
            await r.remove(r.users.get(message.author.id));
            if (page === 1) return;
            page--;
            embed.fields.length = 0;

            for (let i of pages[page - 1]) {
                let start = new Date(i.start_date);
                let end = new Date(i.end_date);
    
                let duration = `${moment.duration(end - start).hours()} hours, ${moment.duration(end - start).minutes()} minutes`;
    
                clans[parseInt(i.host_clan.clanid)] = i.host_clan.btag;
                clans[parseInt(i.opponent_clan.clanid)] = i.opponent_clan.btag;
    
                let fightLog = '';
    
                for (let match of i.games) fightLog += `${clans[match.winner.clan]} ${match.winner.name} BEAT ${match.loser.name} ${clans[match.loser.clan]}\n`;
                
                embed
                    .addField('Host Clan Information', `• Tag + Name: **${i.host_clan.btag} ${i.host_clan.name}**\n• Clan ID: **${i.host_clan.clanid}**\n• Score: **${i.host_clan.score}**`, true)
                    .addField('Opponent Clan Information', `• Tag + Name: **${i.opponent_clan.btag} ${i.opponent_clan.name}**\n• Clan ID: **${i.opponent_clan.clanid}**\n• Score: **${i.opponent_clan.score}**`, true)    
                    .addField('War Information', `• War ID: **${i.warid}**\n• Duration: **${duration}**\n• Total Rounds: **${i.games.length}**`, true)
                    .addBlankField(true)
                    .addField('War Fight Log', `\`\`\`${fightLog}\`\`\``, true);
            }

            embed.setFooter(`Page: ${page}/${numberOfPages}`);
            
            await msg.edit(embed);
        });
        
        forwards.on('collect', async r => {
            await r.remove(r.users.get(message.author.id));
            if (page === pages.length) return;
            page++;
            embed.fields.length = 0;

            for (let i of pages[page - 1]) {
                let start = new Date(i.start_date);
                let end = new Date(i.end_date);
    
                let duration = `${moment.duration(end - start).hours()} hours, ${moment.duration(end - start).minutes()} minutes`;
    
                clans[parseInt(i.host_clan.clanid)] = i.host_clan.btag;
                clans[parseInt(i.opponent_clan.clanid)] = i.opponent_clan.btag;
    
                let fightLog = '';
    
                for (let match of i.games) fightLog += `${clans[match.winner.clan]} ${match.winner.name} BEAT ${match.loser.name} ${clans[match.loser.clan]}\n`;
                
                embed
                    .addField('Host Clan Information', `• Tag + Name: **${i.host_clan.btag} ${i.host_clan.name}**\n• Clan ID: **${i.host_clan.clanid}**\n• Score: **${i.host_clan.score}**`, true)
                    .addField('Opponent Clan Information', `• Tag + Name: **${i.opponent_clan.btag} ${i.opponent_clan.name}**\n• Clan ID: **${i.opponent_clan.clanid}**\n• Score: **${i.opponent_clan.score}**`, true)    
                    .addField('War Information', `• War ID: **${i.warid}**\n• Duration: **${duration}**\n• Total Rounds: **${i.games.length}**`, true)
                    .addBlankField(true)
                    .addField('War Fight Log', `\`\`\`${fightLog}\`\`\``, true);
            }

            embed.setFooter(`Page: ${page}/${numberOfPages}`);

            await msg.edit(embed);
        });

        cancel.on('collect', () => msg.delete());
    });
}
