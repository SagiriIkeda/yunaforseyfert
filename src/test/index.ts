import { Client } from 'seyfert';
import { YunaParser } from '../utils/parser.js';

const client = new Client({ 
    commands: {
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`]
        },
        argsParser: YunaParser({ debug: true })
    }
});

client.start();