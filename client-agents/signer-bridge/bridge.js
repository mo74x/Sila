require('dotenv').config();
const { io } = require('socket.io-client');
const graphene = require('graphene-pk11');

async function main() {
  const TENANT_ID = process.env.TENANT_ID;
  const CLOUD_WS_URL = process.env.CLOUD_WS_URL || 'wss://api.sila.dev';
  const TOKEN_PIN = process.env.TOKEN_PIN;
  
  // Standard path for EgyptTrust ePass2003 on Windows
  const DLL_PATH = process.env.DLL_PATH || 'C:\\Windows\\System32\\eps2003csp11.dll'; 

  console.log(`[Sila Bridge] Connecting tenant ${TENANT_ID} to ${CLOUD_WS_URL}...`);

  const socket = io(CLOUD_WS_URL, {
    auth: { tenantId: TENANT_ID }
  });

  const mod = graphene.Module.load(DLL_PATH, 'EgyptTrustToken');
  mod.initialize();

  const slot = mod.getSlots(0);
  const session = slot.open(graphene.SessionFlag.RW_SESSION | graphene.SessionFlag.SERIAL_SESSION);
  session.login(TOKEN_PIN);
  
  console.log('[Sila Bridge] USB Token authenticated successfully.');

  socket.on('connect', () => {
    console.log('[Sila Bridge] Connected to Sila Cloud.');
    socket.emit('joinRoom', `tenant_bridge_${TENANT_ID}`);
  });

  socket.on('SIGN_HASH', (data, callback) => {
    try {
      console.log('[Sila Bridge] Signature request received.');
      const { hash } = data;
      
      const privateKey = session.findObjects({
        class: graphene.ObjectClass.PRIVATE_KEY
      }).item(0);

      const sign = session.createSign('SHA256_RSA_PKCS', privateKey);
      const hashBuffer = Buffer.from(hash, 'hex');
      const signatureBuffer = sign.once(hashBuffer);
      
      callback({ cadesSignature: signatureBuffer.toString('base64') });
      console.log('[Sila Bridge] Signature returned to cloud.');
    } catch (error) {
      console.error('[Sila Bridge] Signing Error:', error.message);
      callback({ error: error.message });
    }
  });

  process.on('SIGINT', () => {
    console.log('[Sila Bridge] Shutting down securely...');
    session.logout();
    session.close();
    mod.finalize();
    process.exit();
  });
}

main().catch(console.error);