import * as express from 'express';
import * as cors from 'cors';
import axios from 'axios';
const app = express();
import { Analytics, File } from './interfaces.js';
import { processFiles, condense } from './utils.js';
import { MongoClient } from 'mongodb';
import { convertTypeAcquisitionFromJson } from 'typescript';

// TODO questions:
//! questions about design, global database
// how to look inside database inside container
// composable docker compose files?
// also tell justin to trim down the file service. Too many attributes too ambitious too little time

app.use(express.json());
app.use(cors());

let files: File[] = [];
let badfiles: File[] = [];

async function connectDB() {
	try {
		const uri = process.env.DATABASE_URL;
		if (uri === undefined) {
			throw Error('DATABASE_URL environment variable is not specified');
		}
		const mongo = new MongoClient(uri);
		await mongo.connect();
		return await Promise.resolve(mongo);
	} catch (e) {
		console.log(e);
		return null;
	}
}

async function initDB(mongo) {
	try {
		const analytics = mongo.db().collection('analytics');
		await analytics.insertOne({
			key: 'analytics',
			numFiles: 0,
			readability: {},
			badfiles: []
		});
		return analytics;
	} catch (e) {
		console.log(e);
		return null;
	}
}

async function start() {
	const mongo = await connectDB();
	if (mongo === null) throw Error('Database connection failed');
	let analytics = await initDB(mongo);
	if (analytics === null) throw Error('Database initialization failed');
	//const authDB = await initAuthDB(mongo);

	/* setTimeout(() => {
		setInterval(() => {
			try {
				Promise.all([
					axios.post('http://event-bus:4012/events', {
						type: 'ShootFileAnalytics'
					}),
					axios.post('http://event-bus:4012/events', {
						type: 'ShootWordAnalytics'
					})
				]);
				console.log('SENT SHOOT MESSAGES');
			} catch (e) {
				console.log(e);
				return;
			}

			setTimeout(async () => {
				try {
					const indexes = processFiles(files);
					await analytics.updateOne(
						{ key: 'analytics' },
						{
							$set: {
								numFiles: files.length,
								readability: condense(indexes),
								badfiles: badfiles
							}
						}
					);
				} catch (e) {
					console.log(e);
					return;
				}
			}, 1000 * 60); // wait for ShootAnalytics events to get to other services, and for GetAnalytics events to come in. No rush, we'll wait one minute. This is a completely backend async service, not worried about responding to client quickly.
		}, 1000 * 60 * 60 * 24); // night job. Run once every 24 hours for data analytics to be presented to admin.
	}, 1000 * 60); */

	// future considerations: not safe for auth databse to send accessToken to random services or in a response. Must verify accessToken INSIDE auth service and respond with success/failure.
	async function isAuth(req, res, next) {
		console.log('isAuth2.0');
		console.log('Checking Authorization');
		const { uid, accessToken }: { uid: string; accessToken: string } = req.body;
		console.log(`isAuth uid: ${uid}, isAuth accessToken: ${accessToken}`);
		try {
			if (!uid || !accessToken) {
				console.log('1 Missing Information');
				res.status(400).send('Missing Information');
				return;
			}
			const { dbAccessToken, admin } = (await axios.post('http://auth:4003/authData', { uid })).data;
			console.log(`dbAccessToken: ${dbAccessToken}`);
			console.log(`admin: ${admin}`);
			if (!dbAccessToken || !admin) {
				console.log('User does not exist');
				res.status(400).send('User Does Not Exist');
			} else if (accessToken !== dbAccessToken) {
				console.log(`accessToken: ${accessToken} | dbAccessToken: ${dbAccessToken}`);
				console.log(`accessToken === dbAccessToken ${accessToken === dbAccessToken}`);
				console.log(admin);
				res.status(400).send('Unauthorized Access');
			} else {
				console.log('Successful Authentication');
				next();
			}
		} catch (e) {
			console.log('isAuth Error');
			console.log(e);
		}
	}

	// TODO: uncomment isAdmin
	app.post('/analytics', isAuth, async (req, res) => {
		console.log('Made it to analytics service!');
		try {
			Promise.all([
				axios.post('http://event-bus:4012/events', {
					type: 'ShootFileAnalytics'
				}),
				axios.post('http://event-bus:4012/events', {
					type: 'ShootWordAnalytics'
				})
			]);
			setTimeout(async () => {
				const indexes = processFiles(files);
				console.log(`Analytics: ${indexes}`);
				await analytics.updateOne(
					{ key: 'analytics' },
					{
						$set: {
							numFiles: files.length,
							readability: condense(indexes),
							badfiles: badfiles
						}
					}
				);
				const results = await analytics.findOne({ key: 'analytics' });
				res.status(200).send({ numFiles: results.numFiles, readability: results.readability, badfiles: results.badfiles });
			}, 2500);
		} catch (e) {
			console.log(e);
			res.status(500).send({});
		}
	});

	app.post('/events', (req, res) => {
		try {
			if (req.body.type === 'GetWordAnalytics') {
				console.log('GOT MODERATOR MESSAGE');
				badfiles = req.body.data.files;
			} else if (req.body.type === 'GetFileAnalytics') {
				console.log('GOT FILE MESSAGE');
				files = req.body.data.files;
			}
		} catch (e) {
			console.log(e);
		}
		res.send({});
	});

	app.listen(4004, () => {
		console.log('Running on 4004');
	});
}

start();
