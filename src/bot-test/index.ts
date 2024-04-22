import { Client } from 'seyfert';
import { YunaParser } from '../package/utils/parser';

const client = new Client({ 
    commands: {
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`]
        },
        argsParser: YunaParser({
            debug: true,
            config: {
                namedOptions: {
                    ":": false,
                }
            }
        })
    }
});

client.start();