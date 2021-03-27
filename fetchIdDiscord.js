const Discord = require('discord.js');
const client = new Discord.Client();


exports.ListID = [];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const list = client.guilds.get("697995339667603526")
    //console.log(list.members.array())
    list.members.forEach(member => this.ListID.push(member.id))
    console.log(this.ListID)
});

client.login(''); //your token