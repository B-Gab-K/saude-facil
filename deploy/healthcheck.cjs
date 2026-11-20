const secure = !!process.env.TLS_CERT_PATH;
const client = require(secure ? 'node:https' : 'node:http');
// A probe local não transmite dados pessoais e também serve para certificados de teste.
const request = client.get({ hostname: '127.0.0.1', port: Number(process.env.PORT || 3001), path: '/api/operations/health', rejectUnauthorized: false, timeout: 4000 }, response => { response.resume(); process.exitCode = response.statusCode === 200 ? 0 : 1; });
request.on('error', () => { process.exitCode = 1; }); request.on('timeout', () => request.destroy());
