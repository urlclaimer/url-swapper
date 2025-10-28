const http2 = require('http2');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let claimpassword, claimtoken, deletepassword, deletetoken, serverid, vanityurl, mfaToken1, mfaToken2;

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) nosniff/1.0.9164 Chrome/124.0.6367.243 Electron/30.2.0 Safari/537.36",
  "Content-Type": "application/json",
  "X-Super-Properties": "eyJvcyI6IkFuZHJvaWQiLCJicm93c2VyIjoiQW5kcm9pZCBDaHJvbWUiLCJkZXZpY2UiOiJBbmRyb2lkIiwic3lzdGVtX2xvY2FsZSI6InRyLVRSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKExpbnV4OyBBbmRyb2lkIDYuMDsgTmV4dXMgNSBCdWlsZC9NUkE1OE4pIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMzEuMC4wLjAgTW9iaWxlIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzEuMC4wLjAiLCJvc192ZXJzaW9uIjoiNi4wIiwicmVmZXJyZXIiOiJodHRwczovL2Rpc2NvcmQuY29tL2NoYW5uZWxzL0BtZS8xMzAzMDQ1MDIyNjQzNTIzNjU1IiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM1NTYyNCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbCwiaGFzX2NsaWVudF9tb2RzIjpmYWxzZX0=",
  "Cookie": "__dcfduid=e4b41870c0ea11ef8a7146a8012bdadc; __sdcfduid=e4b41870c0ea11ef8a7146a8012bdadc03493787d783a0a0e2f5bb4db161f4576d6b6e54f9daa8327c5fd3f8134d09c4; __cfruid=4389eaa152d58b286c2a2fbc722d11935cc63ac2-1739269782; _cfuvid=1Hc58Q1Yo6cXIWud4hS1_R5QFZMAJiiOVrOJIbWWkjI-1739269782714-0.0.1.1-604800000; cf_clearance=BdF_ewiRLaPoYyreIprXJkSVWfXVCQMQ1h7MIt1mY_o-1739277321-1.2.1.1-JmKhJ2BweCe_XyyQVVm5dNUm.fDE6NVE27a_qVOMTDXYsq_5dEoSObcNJfqQs2Lw5UC8mmAQ72IvYgqx3EjfL2inLPj7SqQJEfY6Cd2RT1FbZDqW.XVk60yGUBLqH8eoH9cp_UP_D.df5583FWOR3NKcdVtXVqd3SEntmDoIe1WVDVkf9f4U_LRIioqUfA3zqrWFSDYK7ZQb0eoG_PBi7Ps_cxnparGFk3Q.xOF4xhNXLOuYOt6piurTczIxdITUy5tUHvLlW5S4in5fzEqQ762fw8I2PhChSov7LV1x0Og"
};

const http2Request = async (method, path, token, customHeaders = {}, body = null) => new Promise((resolve, reject) => {
  const client = http2.connect("https://canary.discord.com");
  const reqHeaders = { 
    ...headers, 
    Authorization: token,
    ...customHeaders 
  };
  const req = client.request({ ":method": method, ":path": path, ...reqHeaders });
  
  let data = "";
  req.on("response", () => {
    req.on("data", (chunk) => {
      data += chunk;
      
    });
    req.on("end", () => {
      resolve(data);
      client.close();
    });
  });
  req.on("error", (err) => {
    reject(err);
    client.close();
  });
  if (body) req.write(body);
  req.end();
});

async function makeRequest(method, path, token, customHeaders = {}, body = null) {
  try {
    const response = await http2Request(method, path, token, customHeaders, body);
    return JSON.parse(response);
  } catch (error) {
    return null;
  }
}

async function requestMfaTicket(token) {
  const response = await makeRequest("PATCH", `/api/guilds/0/vanity-url`, token);
  if (response?.code === 60003) {
    return response.mfa.ticket;
  }
  return null;
}

async function handleMfa(ticket, token, password) {
  const response = await makeRequest("POST", "/api/v9/mfa/finish", token, {}, JSON.stringify({ ticket: ticket, mfa_type: "password", data: password }));
  if (response?.token) {
    return response.token;
  }
  return null;
}

async function initializeMfa(token, password, mfaNumber) {
  if (mfaNumber === 1) {
    console.log({ ">": "MFA Verification Process Started" });
  }
  const ticket = await requestMfaTicket(token);
  if (ticket) {
    const mfaToken = await handleMfa(ticket, token, password);
    if (mfaToken && mfaNumber === 2) {
      console.log({ ">": "MFA Verification Process Completed" });
    }
    return mfaToken;
  }
  return null;
}

function getMfaHeaders(mfaToken) {
  return {
    "X-Discord-MFA-Authorization": mfaToken,
    "Cookie": "__Secure-recent_mfa=${mfaToken}; __dcfduid=e4b41870c0ea11ef8a7146a8012bdadc; __sdcfduid=e4b41870c0ea11ef8a7146a8012bdadc03493787d783a0a0e2f5bb4db161f4576d6b6e54f9daa8327c5fd3f8134d09c4; __cfruid=4389eaa152d58b286c2a2fbc722d11935cc63ac2-1739269782; _cfuvid=1Hc58Q1Yo6cXIWud4hS1_R5QFZMAJiiOVrOJIbWWkjI-1739269782714-0.0.1.1-604800000; cf_clearance=BdF_ewiRLaPoYyreIprXJkSVWfXVCQMQ1h7MIt1mY_o-1739277321-1.2.1.1-JmKhJ2BweCe_XyyQVVm5dNUm.fDE6NVE27a_qVOMTDXYsq_5dEoSObcNJfqQs2Lw5UC8mmAQ72IvYgqx3EjfL2inLPj7SqQJEfY6Cd2RT1FbZDqW.XVk60yGUBLqH8eoH9cp_UP_D.df5583FWOR3NKcdVtXVqd3SEntmDoIe1WVDVkf9f4U_LRIioqUfA3zqrWFSDYK7ZQb0eoG_PBi7Ps_cxnparGFk3Q.xOF4xhNXLOuYOt6piurTczIxdITUy5tUHvLlW5S4in5fzEqQ762fw8I2PhChSov7LV1x0Og"
  };
}

async function deleteInvite() {
  await makeRequest("DELETE", `/api/invite/${vanityurl}`, deletetoken, getMfaHeaders(mfaToken2));
}

async function patchVanityUrl() {
  const response = await makeRequest("PATCH", `/api/guilds/${serverid}/vanity-url`, 
    claimtoken, 
    getMfaHeaders(mfaToken1), 
    JSON.stringify({ code: vanityurl })
  );
  if (response) {
    console.log(response);
  }
}

async function getUserInput() {
  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
  vanityurl = await question("Silinecek URL:> ");
  serverid = await question("Guild ID:> ");
  deletetoken = await question("URL'yi Silecek Token:> ");
  claimtoken = await question("URL'yi Alacak Token:> ");
  deletepassword = await question("MFA Password to Delete:> ");
  claimpassword = await question("MFA Password to Claim:> ");
}

function confirmAction() {
  console.log('\x1b[31m[+] SWAP İşlemini Tamamlamak İçin ENTER Tuşuna Basın...\x1b[0m');
  rl.question('', async () => {
    await deleteInvite();
    patchVanityUrl();
    rl.close();
  });
}

async function start() {
  await getUserInput();
  mfaToken1 = await initializeMfa(claimtoken, claimpassword, 1);
  mfaToken2 = await initializeMfa(deletetoken, deletepassword, 2);
  if (mfaToken2) confirmAction();
}
start();
