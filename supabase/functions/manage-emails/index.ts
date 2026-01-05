
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Minimal IMAP Client for Deno (Reused from scan-emails)
 * Implements LOGIN, SELECT, STORE +FLAGS/-FLAGS, LOGOUT
 */
class SimpleIMAP {
    private conn: Deno.TlsConn | null = null;
    private buffer: Uint8Array = new Uint8Array(1024 * 64);
    private tagCount: number = 0;

    constructor(private config: any) { }

    async connect() {
        this.conn = await Deno.connectTls({
            hostname: this.config.host,
            port: this.config.port || 993,
        });
        await this.readUntil("* OK");
    }

    async login() {
        return this.sendCommand(`LOGIN "${this.config.user}" "${this.config.password}"`);
    }

    async select(mailbox: string = 'INBOX') {
        return this.sendCommand(`SELECT ${mailbox}`);
    }

    // New: Action Methods
    async addFlags(ids: number[], flags: string) {
        if (ids.length === 0) return;
        const idSet = ids.join(',');
        // STORE 1,2,3 +FLAGS (\Seen)
        return this.sendCommand(`STORE ${idSet} +FLAGS (${flags})`);
    }

    async removeFlags(ids: number[], flags: string) {
        if (ids.length === 0) return;
        const idSet = ids.join(',');
        // STORE 1,2,3 -FLAGS (\Seen)
        return this.sendCommand(`STORE ${idSet} -FLAGS (${flags})`);
    }

    async logout() {
        if (this.conn) {
            try {
                await this.sendCommand(`LOGOUT`);
                this.conn.close();
            } catch (e) { }
        }
    }

    private async sendCommand(cmd: string) {
        if (!this.conn) throw new Error("Not connected");
        const tag = `A${this.tagCount++}`;
        const encoder = new TextEncoder();
        await this.conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
        return this.readUntil(`${tag} OK`);
    }

    private async readUntil(terminator: string): Promise<string> {
        if (!this.conn) return "";
        const decoder = new TextDecoder();
        let accumulated = "";
        let buf = new Uint8Array(2048);

        while (true) {
            const n = await this.conn.read(buf);
            if (n === null) break; // EOF
            const chunk = decoder.decode(buf.subarray(0, n));
            accumulated += chunk;
            if (accumulated.includes(terminator)) {
                break;
            }
            if (accumulated.includes("NO") && accumulated.includes(`A${this.tagCount - 1}`)) {
                throw new Error("IMAP Error: " + accumulated);
            }
            if (accumulated.includes("BAD") && accumulated.includes(`A${this.tagCount - 1}`)) {
                throw new Error("IMAP Bad Command: " + accumulated);
            }
        }
        return accumulated;
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { config, uids, action, box = 'INBOX' } = await req.json();

        if (!config || !uids || !Array.isArray(uids) || uids.length === 0) {
            throw new Error("Invalid parameters");
        }

        const client = new SimpleIMAP({
            host: config.imapHost,
            port: config.imapPort || 993,
            user: config.imapUser || config.smtpUser,
            password: config.imapPassword || config.smtpPassword
        });

        await client.connect();
        await client.login();
        await client.select(box);

        if (action === 'mark_read') {
            await client.addFlags(uids, '\\Seen');
        } else if (action === 'mark_unread') {
            await client.removeFlags(uids, '\\Seen');
        } else if (action === 'delete') {
            await client.addFlags(uids, '\\Deleted');
            // Assuming we don't EXPUNGE immediately unless requested, 
            // but for "Delete" usually users expect it gone. 
            // Some clients hide \Deleted. 
            // Let's EXPUNGE to be sure? Or just leave marked?
            // Safer to just mark \Deleted.
        }

        await client.logout();

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error(e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
