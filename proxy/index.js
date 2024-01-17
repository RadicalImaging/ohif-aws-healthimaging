import {
    promisify
} from 'node:util';
import {
    pipeline
} from 'node:stream';
import aws4 from 'aws4';
import {
    createServer
} from 'http';

const streamPipeline = promisify(pipeline);
const awsHost = process.env.AWS_HOST || 'runtime-medical-imaging.us-east-1.amazonaws.com';
const awsProtocol = process.env.AWS_PROTOCOL || 'https';

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Max-Age': 2592000, // 30 days
    'Access-Control-Allow-Headers': '*'
};
const awsCredentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
};

const proxy = createServer(async (req, res) => {
    console.log('Proxying request to:',req.url);
    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        return res.end();
    }
    // Validate user here
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const uri = `${awsProtocol}://${awsHost}${req.url}`;
            const newReq = {
                path: req.url,
                service: 'medical-imaging',
                host: awsHost,
                method: req.method,
                body: body || null,
            };
            aws4.sign(newReq, awsCredentials);
            const proxyRes = await fetch(uri, newReq);
            res.writeHead(proxyRes.status, { ...headers,
                ...proxyRes.headers
            });
            return await streamPipeline(proxyRes.body, res);
        } catch (err) {
            console.error(err);
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            return res.end('Internal Server Error');
        }
    });
});
const port = process.env.PORT || 8089;
proxy.listen(port, () => {
    console.log(`Healthimaging proxy server is running on http://:::${port}`);
});
