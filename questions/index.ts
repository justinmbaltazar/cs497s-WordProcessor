import * as express from 'express';
import { Request, Response } from 'express';
import * as logger from 'morgan';
import * as cors from 'cors';
import axios from 'axios';
import { MongoClient } from 'mongodb';
import {isAuth } from './auth';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(cors());

// uid : security question

async function connectDB(): Promise<MongoClient>{
	const uri = process.env.DATABASE_URL;

	if (uri === undefined) {
			throw Error('DATABASE_URL environment variable is not specified');
	}
	
	const mongo = new MongoClient(uri);
	await mongo.connect();
	return await Promise.resolve(mongo);
}

async function initDB(mongo: MongoClient) {
	const db = mongo.db();

	if (await db.listCollections({ name: 'questions' }).hasNext()) {
		db.collection('questions').drop(function(err, delOK) {
			if (err) throw err;
			if (delOK) console.log("Collection deleted");
		});
		console.log('Collection deleted.');
	}

	if (await db.listCollections({ name: 'questions' }).hasNext()) {
		console.log('Collection already exists. Skipping initialization.');
		return;
	}

	const questions = db.collection('questions');
	const result = await questions.insertMany([
		{ uid: 'a', question: 'test'},
		{ uid: 'b', question: 'test'},
		{ uid: 'c', question: 'test'},
	]);

	console.log(`Initialized ${result.insertedCount} questions`);
	console.log(`Initialized:`);

	for (let key in result.insertedIds) {
		console.log(`  Inserted user with ID ${result.insertedIds[key]}`);
	}
}

async function verify(mongo: MongoClient, uid: string, question: string) {
	const questions = mongo.db().collection('questions');
	const ret = questions.find({$and: 
		[{uid: uid},
		{question: question}]
	});
	return ret.toArray();
}

async function deleteUser(mongo: MongoClient, uid: string) {
	const questions = mongo.db().collection('questions');
	return questions.deleteOne({uid});
}

async function reset(mongo: MongoClient) {
	const questions = mongo.db().collection('questions');
	return questions.deleteMany({});
}

async function insertQuestion(mongo: MongoClient, uid: string, question: string) {
	const questions = mongo.db().collection('questions');
	return questions.insertOne({uid, question});
}

async function start() {
	const mongo = await connectDB();
	await initDB(mongo);
	// will be used for checking and returning
	app.post('/verify', async (req: Request, res: Response) => {
		const { uid, question, otp }: { uid: string, question: string, otp: string } = req.body;
		try {
			if ( Object.keys(req.body).length > 7 ){
				res.status(400).send({ message: 'BAD REQUEST' });
			} else {
				const ret = await verify(mongo, uid, question);
				if (ret.length > 0) {
					axios.post('http://event-bus:4012/events', {
						type: 'ChangePassword',
						data: {
							uid,
							otp
						}
					});
					res.status(201).send(ret);
				} else {
					res.status(404).send({ message: 'NOT FOUND'});
				}
			}
		} catch (e) {
			res.status(500).send(e);
		}
	});	

	app.post('/new/user', isAuth, async (req: Request, res: Response) => {
		const { uid, accessToken, question }: { uid: string, accessToken: string, question: string } = req.body;
		console.log(`accesToken inside endpoint: ${accessToken} ${uid}`);
		try {
			const ret = await insertQuestion(mongo, uid, question);
			if (ret.acknowledged) {
				res.status(201).send(ret);
			} else {
				res.status(400).send(ret);
			}
		} catch (e) {
			res.status(500).send(e);
		}
	});

	app.delete('/reset', async (req: Request, res: Response) => {
		try {
			const ret = await reset(mongo);
			res.status(201).send(ret);
		} catch (e) {
			res.status(500).send(e);
		}
	});


	app.post('/events', async (req: Request, res: Response) => {
		const {type, data}: {type: string, data: { uid: string, email?: string, accessToken?: string, admin?: boolean }} = req.body;
		if (type === 'AccountDeleted') {
			const { uid }: { uid: string, email?: string } = data;
			const ret = await deleteUser(mongo, uid);
			if (ret.acknowledged) {
				res.status(201).send(ret);
			} else {
				res.status(400).send(ret);
			}
		}
	});

	app.listen(4006, () => {
		console.log('Listening on 4006');
	});
}

start();

