const express = require('express');
const ngrok = require('ngrok');
const rp = require('request-promise-native');
const dialogflow = require('dialogflow');
var msg='';
const app = express();
const port = process.env.PORT || 5111;

app.use(express.json());

// Replace the values here.
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'ultrasupport-ftwp-62f02c72f9bd.json';
const INSTANCE_URL = 'https://api.maytapi.com/api';
const PRODUCT_ID = '83646b4c-65f7-4003-aa3c-ad70ebc1a9e6';
const PHONE_ID = '8443';
const API_TOKEN = 'bc7afa23-6cb4-4d4f-afdf-c8f6e9b39f12';
const PROJECT_ID = 'ultrasupport-ftwp';

if (!PRODUCT_ID || !PHONE_ID || !API_TOKEN) throw Error('You need to change PRODUCT_ID, PHONE_ID and API_KEY values in app.js file.');

async function send_message(body) {
	console.log(`Request Body:${JSON.stringify(body)}`);
	let url = `${INSTANCE_URL}/${PRODUCT_ID}/${PHONE_ID}/sendMessage`;
	let response = await rp(url, {
		method: 'post',
		json: true,
		body,
		headers: {
			'Content-Type': 'application/json',
			'x-maytapi-key': API_TOKEN,
		},
	});
	console.log(`Response: ${JSON.stringify(response)}`);
	return response;
}

async function runSample(text = 'hello', sessionId) {
	// A unique identifier for the given session

	// Create a new session
	const sessionClient = new dialogflow.SessionsClient();
	const sessionPath = sessionClient.sessionPath(PROJECT_ID, sessionId);

	// The text query request.
	const request = {
		session: sessionPath,
		queryInput: {
			text: {
				// The query to send to the dialogflow agent
				text,
				// The language used by the client (en-US)
				languageCode: 'en-US',
			},
		},
	};
	console.log('text',text);
	msg=msg+'  text= '+text;
	// Send request and log result
	const responses = await sessionClient.detectIntent(request);
	console.log('Detected intent');
	const result = responses[0].queryResult;
	console.log(`  Query: ${result.queryText}`);
	console.log(`  Response: ${result.fulfillmentText}`);
	if (result.intent) {
		console.log(`  Intent: ${result.intent.displayName}`);
	} else {
		console.log(`  No intent matched.`);
	}
	return result;
}

async function setup_network() {
	let public_url = await ngrok.connect(port);
	console.log(`Public Url:${public_url}`);
	let webhook_url = `${public_url}/webhook`;
	let url = `${INSTANCE_URL}/${PRODUCT_ID}/setWebhook`;
	let response = await rp(url, {
		method: 'POST',
		body: { webhook: webhook_url },
		headers: {
			'x-maytapi-key': API_TOKEN,
			'Content-Type': 'application/json',
		},
		json: true,
	});
	console.log(`Response: ${JSON.stringify(response)}`);
}

app.get('/', (req, res) => res.send('Hello World!'));

app.post('/webhook', async (req, res) => {
	res.sendStatus(200);
	let { message, conversation } = req.body;
	console.log("MESSAGE",message,conversation);
	let { type, text, fromMe } = message;
	if (fromMe) return;
	if (type === 'text') {
		let result = await runSample(text, conversation);
		if (result && result.fulfillmentText) {
			let body = {
				to_number: conversation,
				message: result.fulfillmentText,
				type: 'text',
			};
			await send_message(body);
			console.log('output',result.fulfillmentText);
			msg=msg+'  output = '+result.fulfillmentText;
		}
	} else {
		console.log(`Ignored Message Type:${type}`);
	}
});

app.listen(port, async () => {
	console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
	console.log(`Example app listening at http://localhost:${port}`);
	console.log('msg',msg);
	await setup_network();
});
