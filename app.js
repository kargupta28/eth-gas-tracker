const Discord = require('discord.js');
const fetch = require('node-fetch')
require('dotenv').config();
const bot = new Discord.Client()
let alerts = new Map() // Map of gwei,userID

bot.on('ready', () => {
  console.log('bot logged in')
})

const prefix = '$'

bot.on('message', async (msg) => {
  if(msg.content[0] !== prefix) {
    //console.log('no prefix')
    return
  }

  const args = msg.content.slice(prefix.length).trim().split(' ')
  const command = args.shift().toLowerCase()

  if(command === 'help') {
    let embed = new Discord.MessageEmbed()
    .setTitle('🙏 Help 🙏')
    .setDescription('')
    .addField('**$gas**', `Usage: $gas
Result: Returns latest gas prices`)
    .addField('**$alert**', `Usage: $alert @user #gwei __OR__ $alert me #gwei
Result: Sets an alert for a mentioned user or current user at set gwei`)
    .addField('**$joke**', `Usage: $joke
Result: Returns hilarious jokes`)
    .addField('**$clear**', `Usage: $clear #number
Result: Clears #number+1 past messages`)
    .addField('**Note:**', `1. Price is in gwei not Gwei.
2. Can't set #gwei in $alert under 50 or over 500 gwei.
3. Can't set #gwei in decimal value, it will be converted to closest floor value.
4. $alert alerts users when the **average** ETH gas price reaches set gwei.
5. The bot will alert with two separate messages with mentions to grab your attention to the channel.`)
    .setFooter('Commands must be used Exactly as described above | v0.1', bot.user.displayAvatarURL())
    .setAuthor(bot.user.username, bot.user.displayAvatarURL())

    msg.reply(embed)
  }

  if(command === 'clear') {
    let size = 2

    if(args[0]) {
      // +1 to delete the '$clear #' command
      size = parseInt(args[0]) + 1;
    }

    msg.channel.bulkDelete(size)
    return msg.channel.send(`Deleted ${args[0]} posts. Shhhh.`)

    // Delete messages from specific user
    // check bot.GuildMember.roles()
    //const user = msg.mentions.users.first()
    //const msgList = msg.channel.message.fetch({limit: 100})
  }

  if(command === 'joke') {
    let joke = await getJoke()

    return msg.reply(`Here's your joke

    ${joke.setup}

    ${joke.punchline}
    `)
  }

  if(command == 'gas') {
    let gasPrices = await getGasPrices()
    let date = new Date()

    let embed = new Discord.MessageEmbed()
    .setTitle('⛽ Latest ETH Gas Prices')
    .setDescription('')
    .addField('**Slow** 🐢', `${gasPrices.safeLow / 10} gwei **|** ${gasPrices.safeLowWait * 60} seconds`)
    .addField('**Average** 🚶', `${gasPrices.average / 10} gwei **|** ${gasPrices.avgWait * 60} seconds`)
    .addField('**Fast** 🏃', `${gasPrices.fast / 10} gwei **|** ${gasPrices.fastWait * 60} seconds`)
    .addField('**Fastest** 🏎️', `${gasPrices.fastest / 10} gwei **|** ${gasPrices.fastestWait * 60} seconds`)
    .setFooter(`Fetched from EthGasStation.info | ${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`, bot.user.displayAvatarURL())
    .setAuthor(bot.user.username, bot.user.displayAvatarURL())
    .setColor('')

    return msg.channel.send(embed)
  }

  if(command == 'alert') {
    const user = getUserFromMention(args[0])
    let userID = 0
    let gwei = 0
    let newUsers = new Array()

    if(!user) {
      if(args[0] !== 'me') {
        return msg.reply("You didn't use a proper mention or 'me' keyword ???? Try again or try $help 🤷")
      }
      userID = msg.member.id
    } else {
      userID = user.id
    }

    if(!isNumeric(args[1])) {
      // check if args[1] === 'clear', then clear user's alerts

      return msg.reply("#gwei was not a number ???? Try again or try $help 🤷")
    }
    gwei = parseInt(args[1])

    if(gwei < 50 | gwei > 500) {
      return msg.reply("You entered an incorrect #gwei amount ???? Try again or try $help 🤷")
    }

    // Check if gwei exists in alerts, then fetch the array values to append to the end
    if(alerts.has(gwei)) {
      newUsers = alerts.get(gwei)

      // check if duplicate gwei amount exist in alerts already
      if(newUsers.includes(userID)) {
        return msg.reply(`You already have an alert for ${gwei} gwei ???? Try again or try $help 🤷`)
      }

      alerts.delete(gwei)
      newUsers.push(userID)
    } else {
      newUsers.push(userID)
    }

    // Then add userID,newAlerts as a new pair into alerts
    alerts.set(gwei, newUsers)

    return msg.reply(`You will be alerted when ETH Gas price reaches ${args[1]} gwei!`)
  }

}) 

async function getJoke() {
      let result = await fetch('https://official-joke-api.appspot.com/random_joke')
      let json = await result.json()
      return json
    }

async function getGasPrices() {
      let result = await fetch('https://ethgasstation.info/api/ethgasAPI.json?api-key=8db71f46487dbd5bf1dd701626949c137f3b89e3d6391838539edbd80069')
      let json = await result.json()
      return json
    }

function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return bot.users.cache.get(mention);
	}
}

async function checkAllAlerts() {
  let gasPrices = await getGasPrices()
  let avgGwei = gasPrices.average / 10

  for(let gwei of alerts.keys()) {
    if(gwei >= avgGwei) {
      let userArray = alerts.get(gwei)
      let userString = `<@${userArray[0]}>`

      for(let i=1; i < userArray.length; i++) {
        userString += `, <@${userArray[i]}>`
      }

      alerts.delete(gwei)
      bot.channels.cache.get('822007941447680040').send(`ETH Gas price reached under ${gwei} gwei ${userString}!`)
      bot.channels.cache.get('822007941447680040').send(`ETH Gas price reached under ${gwei} gwei ${userString}!`)
      return bot.channels.cache.get('822007941447680040').send(`$gas`)
    }
  }
}

setInterval(async () => {
  checkAllAlerts()
}, 5000)

bot.login(process.env.BOT_TOKEN)