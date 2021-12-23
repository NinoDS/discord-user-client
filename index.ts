import { readLines } from "https://deno.land/std/io/mod.ts";

const config = JSON.parse(await Deno.readTextFile("./config.json"));
const login = config.login;
const password = config.password;

interface Message {
    tts?: boolean;
    nonce?: string;
    content?: string;
    embeds? : Embed[];
    message_reference?: object;
}

interface Embed {
    type?: string;
    author?: { name: string, url?: string, icon_url?: string }
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    image?: { url: string };
    fields?: { name: string, value: string, inline?: boolean }[];
    thumbnail?: { url: string };
    footer?: { text: string, icon_url?: string }
}

class Client {
    private token?: string;

    public constructor() { }


    public async login(login: string, password: string) {
        const request = await fetch('https://discord.com/api/v9/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                login: login,
                password: password,
                undelete: false,
                captcha_key: null,
                login_source: null,
                gift_code_sku_id: null
            }),
        });

        const response = await request.json();

        if (request.status !== 200) {
            if (response.captcha_key === ["captcha_required"]) {
                console.log("Captcha required");
                return;
            }
        }

        if (response.mfa === true) {
            console.log("Please enter your 2FA code.");
            const { value: code } = await readLines(Deno.stdin).next();
            const totp = await this.totp(code, response.ticket);
            this.token = totp.token;
        } else {
            this.token = response.token;
        }

        return response;
    }

    private async totp(code: string, ticket: string) {
        const request = await fetch('https://discord.com/api/v9/auth/mfa/totp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                gift_code_sku_id: null,
                login_source: null,
                ticket: ticket
            })
        });

        if (request.status !== 200) {
            throw new Error(`${(request.statusText)}`);
        }

        return await request.json();
    }

    public setToken(token: string): void {
        this.token = token;
    }

    public async sendMessage(channel: string, message: string | Message, typing: boolean = true) {

        if(typing) {
            client.sendTyping(channel)
        }


        if (typeof message === 'string') {
            message = { content: message };
        }

        const request = await fetch(`https://discord.com/api/v9/channels/${channel}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            },
            body: JSON.stringify(message)
        });

        if (request.status !== 200) {
            console.log(request)
        }

        return await request.json();
    }

    public async joinGuild(inviteLink: string | URL) {
        if (typeof inviteLink === 'string') {
            inviteLink = new URL(inviteLink);
        }
        const inviteCode = inviteLink.pathname.split('/')[1];

        const request = await fetch(`https://discord.com/api/v9/invites/${inviteCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            },
            body: "{}"
        });

        const response = await request.json();

        if (request.status !== 200) {
            throw new Error(`${response.message}`);
        }

        return response;
    }

    public async sendTyping(channel: string) {
        const request = await fetch(`https://discord.com/api/v9/channels/${channel}/typing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            }
        });

        if (request.status != 204) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }
    }

    public async createThread(channel: string, message: string, name: string, archiveDuration: number) {
        const request = await fetch(`https://discord.com/api/v9/channels/${channel}/messages/${message}/threads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            },
            body: JSON.stringify({
                name: `${name}`,
                type: 11,
                auto_archive_duration: archiveDuration,
                location: 'Message'
            })
        })

        if (request.status != 201) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }
    }
}

const client = new Client();
client.setToken(config.token);
await client.sendMessage('Channel ID', {
    embeds: [
        {
            type: 'rich',
            title: "This is a title",
            description: "This is a Description",
            url: "This is the URL",
            color: 16711422,
            image: {url: 'This is the image URL'},
            fields: [
                {name: 'This is a field name', value: 'This is a field value'}
            ],
            thumbnail: {url: 'This is a thumbnail image URL'},
            footer: {text: 'This is a footer text', icon_url: 'This is a footer icon URL'},
            author: {name: 'This is the author name', url: 'This is the author URL', icon_url: 'This is the author icon URL'}
        }
    ], 
    message_reference: {
        channel_id: 'Channel ID',
        guild_id: 'Guild ID',
        message_id: 'Message ID'
    }
}, false);
