const Discord = require('discord.js');
const { Util } = require('discord.js');
const ytdl = require('ytdl-core');
const PACKAGE = require('./package.json');
const { YTSearcher } = require('ytsearcher');
const searcher = new YTSearcher('AIzaSyBHFEL97baKGiCmAYSaae8QCtTjKvrTJPY');
const { ListID } = require('./fetchIdDiscord.js');
const {
    PREFIX,
    TOKEN,
    USERID
} = require('./config.js');


const client = new Discord.Client();
const queue = new Map();

var loopQ = false;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
})

client.on('message', async message => {

    try {
        if (!ListID.includes(`${message.member.id}`))
            return;
    } catch (err) {
        return err;
    }
    if (message.isMentioned(`${USERID}`)) {
        message.reply(`My prefix is \`\`${PREFIX}\`\``);
    }
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    let QUERY = message.content.trim();
    let command = message.content.toLowerCase().split(' ')[0];
    command = command.slice(PREFIX.length)

    const serverQueue = queue.get(message.guild.id);


    if (message.content.startsWith(PREFIX)) {
        if (command == 'play' || command == 'p') {
            QUERY = QUERY.substr(QUERY.indexOf(" ") + 1);
            const voiceChannel = message.member.voiceChannel;

            // ------------------- CHECK ----------------------
            if (message.member.voiceChannel === undefined) return message.channel.send(`You're not in a voice channel.`);
            if (QUERY == " ") return message.channel.send(`Please enter a song.`);
            let vc = client.voiceConnections.find(val => val.channel.guild.id == message.member.guild.id)
            if (vc && vc.channel.id != message.member.voiceChannel.id) return message.channel.send(`You must be in the same voice channel as me.`);
            // ------------------- CHECK ----------------------
            
            
            await playFunction(message, QUERY, voiceChannel);
            
            

            return;
        }
        if (command == 'np' || command == 'np') {
            nowplaying(message, serverQueue);
            return;
        }
        if (command == 'skip' || command == 's') {
            if(message.content == `${PREFIX}skip` || message.content == `${PREFIX}s`){
                message.react('✅')
            }
            skip(message, serverQueue);
            return;
        }
        if (command == 'leave' || command == 'l') {
            leave(message, serverQueue);
            return;
        }

        if (command == 'q' || command == 'queue') {
            queueSongs(message, serverQueue)
            return;
        }

        if (command == 'rm' || command == 'remove') {
            QUERY = QUERY.substr(QUERY.indexOf(" ") + 1);
            remove(message, QUERY, serverQueue)
            return;
        }

        if (command == 'loop') {
            if (loopQ == false) {
                loopQ = true;
                message.channel.send("Loop is enable!");
                console.log(loopQ)
                return;
            } else if (loopQ == true) {
                loopQ = false;
                message.channel.send("Loop is disable!")
                return;
            }
            return;
        }
    } else {
        message.channel.send('You need to enter a valid command!')
    }

});


async function playFunction(message, QUERY, voiceChannel) {
    const serverQueue = queue.get(message.guild.id);
    const searchResult = await searcher.search(QUERY, { type: 'video' });
    const page = searchResult.currentPage;
    const videoEntry = page[0];
    url = videoEntry.url
    const songInfo = await ytdl.getInfo(url.replace(/<(.+)>/g, '$1'));
	const song = {
        id: songInfo.videoDetails.video_id,
        title: Util.escapeMarkdown(songInfo.videoDetails.title),
        url: songInfo.videoDetails.video_url
    };
    // ------------------- PUSH SONG ----------------------

    
    if (!serverQueue){
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            playing: true
        };
        queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);
        
        const play = async song => {
            const svQueue = queue.get(message.guild.id);
            if (!song) {
                svQueue.voiceChannel.leave();
                svQueue.textChannel.send(`. hết`);
                loopQ = false;
                queue.delete(message.guild.id);
                return;
            }
            const dispatcher = svQueue.connection.playStream(ytdl(song.url))
                .on('end', () => {
                    if(loopQ){
                        svQueue.songs.push(songs[0])
                    }
                    svQueue.songs.shift();
                    play(svQueue.songs[0]);
                })
                .on('error', error => console.error(error));
                svQueue.textChannel.send(`🎶 Start playing: **${song.title}**`);
                
        };
        try {
            const connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(queueConstruct.songs[0]);
        } catch (error) {
            console.error(`I could not join the voice channel: ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send(`I could not join the voice channel: ${error}`);
        }
    }else{
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`✅ **${song.title}** has been added to the queue!`);
    }
};


function skip(message, serverQueue){
    if (!serverQueue) return message.channel.send('There is nothing playing that I could skip for you.');
    if (serverQueue.songs.length < 1){
        message.channel.send(`It's the last song of the queue.`);
    }
	serverQueue.connection.dispatcher.end('Skip');
}

function queueSongs(message, serverQueue){
    if (!serverQueue) return message.channel.send('There is nothing playing.');
    const songs = []
    serverQueue.songs.map(song => songs.push(song.title));
    for(var i = 0; i < serverQueue.songs.length; i++){
        songs[i] = String([i] + `. `).concat(songs[i])
    };
    return message.channel.send(`${songs.map(song => `${song}`).join('\n')}
    **Now playing:** ${serverQueue.songs[0].title}`);

}

function nowplaying(message, serverQueue){
	if (!serverQueue) return message.channel.send('There is nothing playing.');
	return message.channel.send(`🎶 Now playing: **${serverQueue.songs[0].title}**`);
}

function remove(message, QUERY, serverQueue){
    if (!serverQueue) return message.channel.send(`There is nothing playing.`);
    if (serverQueue.songs.length > 0) {
        if (QUERY > serverQueue.songs.length) return message.channel.send('**I\'m sorry, it\'s not available.**')
        var removedSong = serverQueue.songs.splice(QUERY, 1);
        message.channel.send('**:wastebasket: Removed: **' + '`' + removedSong[0].title + '`')
    }
    return;
}

function leave(message, serverQueue){
    if(!serverQueue) return message.channel.send(`There is nothing playing.`)
    loopQ = false;
    if (message.content === `'leave`){
        message.react('🍚')
    }
    serverQueue.songs = []
    serverQueue.connection.dispatcher.end();
    return;
}
client.login(TOKEN);