import axios from 'axios';
import * as cheerio from 'cheerio';
import { Client, GatewayIntentBits } from 'discord.js';
import { getResponses } from './tools/response.js';
import keep_alive from './keep_alive.js';
import 'dotenv/config';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on('error', (error) => {
  console.log('Discord Client error : ', error);
})

client.on('rateLimit', data => {
    // Log the rate limit information to your Render console
    // This is the key place to look for evidence!
    console.log('--- DISCORD RATE LIMIT HIT ---');
    console.log(`Timeout (ms): ${data.timeout}`);
    console.log(`Limit: ${data.limit}`);
    console.log(`Method: ${data.method}`);
    console.log(`Path: ${data.path}`);
    console.log(`Route: ${data.route}`);
    console.log(`Global: ${data.global}`); // Crucial check for IP bans
    console.log('------------------------------');

    // If 'data.global' is true, it means you've hit the Global Rate Limit (50 req/sec) 
    // or a related IP ban, which is often the cause of the bot being unable to log in on Render.
    if (data.global) {
        console.log('!!! GLOBAL RATE LIMIT HIT !!! This may be due to a shared IP ban on the hosting provider (Render).');
        console.log(`Waiting for ${data.timeout}ms before retrying.`);
    }
});

const CHANNEL_ID = '1448290635147903107';
// const SERVER_IP = '15.235.218.24:444 - SG, AS';
const SERVER_IP = '148.113.17.85:444';
let isPaused = false;

client.once('clientReady', () => {
  console.log('Bot is online!');
  checkScores();
  setInterval( async () => {
    let res = await axios.get('https://smt-alert.onrender.com');
    console.log('keeping server alive ',res.data);
    if (!isPaused) {
      checkScores();
    }
  }, 300000); //5min
});

async function checkScores() {
  try {
    const { data } = await axios.get('https://ntl-slither.com/ss/');
    const $ = cheerio.load(data);
    
    let serverFound = false;
    let scoreFound = false;

    let serverIP = '';
    let score = '';
    let player = '';

    const targetNames = [
      'smt',
      'dino',
      'fsg',
      'rekt',
      'vn',
      'tos',
      'ind',
      'lwk',
      '[nm]',
      'nm ',
      'hyena',
    ];

    let matchFound = false;
    let matchFound2 = false;
    let matchFound3 = false;

    $('tr').each((i, el) => {
      if (
        $(el).find("span[style='user-select: all']").text().trim() === SERVER_IP
      ) {
        // serverIP = $(el).find('th').text().trim();
        serverIP = $(el).find("span[style='user-select: all']").text().trim();

        serverFound = true;
      }
      if (serverFound) {
        player = $(el).find('.tdnick').text().trim();
        score = parseInt($(el).find('.tdscore').text().trim());

        if (score) {
          serverFound = false;
          scoreFound = true;
          console.log(player, score, serverIP);

          const extractedStrings =
            player
              .match(/\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\}/g)
              ?.map(str => str.slice(1, -1).replace(/\s+/g, '')) || [];
          matchFound = extractedStrings.some(extracted =>
            targetNames.some(
              name => name.toLowerCase() === extracted.toLowerCase()
            )
          );

          const words = player.split(/\s+/);
          matchFound2 = words.some(word =>
            targetNames.some(name => name.toLowerCase() === word.toLowerCase())
          );

          const modifiedPlayer = player.replace(/\s+/g, '');
          matchFound3 = targetNames.some(
            name => name.toLowerCase() === modifiedPlayer.toLowerCase()
          );
        }
      }
      if (
        scoreFound &&
        score >= 30000 &&
        (matchFound || matchFound2 || matchFound3)
      ) {
        
        scoreFound = false;
        sendAlert(serverIP, player, score);
      }
    });
  } catch (error) {
    console.error('Error fetching score data:', error);
  }
}

async function sendAlert(serverIP, player, score) {
  try {
    

    const channel = await client.channels.fetch(CHANNEL_ID);
    let notifyCommand = score < 50000 ? '@here' : '@everyone';

    if (!channel) {
      console.error(`Channel with ID ${CHANNEL_ID} not found`);
      return;
    }

    const link = 'https://ntl-slither.com/ss/?reg=as';
    
    if (player.toLowerCase().includes('smt')) {
      await channel.send(
        `🟢 Help the player! 🟢\n\nThe player "**${player}**" is scoring over "**${score}**" on this server "**${serverIP}**"! \n\n
        || ${notifyCommand} || [NTL Leaderboard Link](${link})`
      );
    } else {
      await channel.send(
        `🔴 Kill the player! 🔴\n\nThe player called "**${player}**" is scoring over "**${score}**" on this server "**${serverIP}**"\n\n|| ${notifyCommand} || [NTL Leaderboard Link](${link})`
      );
    }

    console.log(`Alert sent for player ${player} with score ${score}`);
    isPaused = true;
    setTimeout(() => {
      isPaused = false;
    }, 1500000); //25 mins
  } catch (error) {
    console.error('Error sending alert:', error);
  }
}

getResponses(client);

client.login(process.env.BOT_TOKEN);
