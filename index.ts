import { Client } from './module/client.ts';
import { Gateway } from './module/gateway.ts';
const config = JSON.parse(await Deno.readTextFile("./config.json"));
const cmdFiles = Deno.readDirSync("./commands/");
const client = new Client();
const gateway = new Gateway(config.token);

client.setToken(config.token);

gateway.addEventListener("MESSAGE_CREATE", (cEvent) => {
    let event = cEvent as CustomEvent;
    let content = event.detail.content;
    if (!content.startsWith(config.prefix)) return;
    content = content.replaceAll(config.prefix, "").split(' ');
    let command = content[0];
    let args = content.splice(0,1);

    for (const file of cmdFiles) {
        if (file.name === `${command}.ts`){
            import(`./commands/${file.name}`).then((cmd) => {
                cmd.execute(client, event, args);
            })
        }
    }
});

gateway.addEventListener('READY', (client) => {
    console.log(`Logged in as ${(client as CustomEvent).detail.user.username}`);
})