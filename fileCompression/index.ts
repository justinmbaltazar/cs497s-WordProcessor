import express, { request, response }from 'express';
import logger from 'morgan';
import cors from 'cors';
import { encode, decode } from 'lossless-text-compression';
const JSZip = require('jszip');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(cors());

// fileId: compressedContent
const db = {}

app.get('user/:id/file/zip', (req: request, res: response) => {
	const { fileId }: { fileId: string } = req.body;
	try {
		if (fileId in db) {
			const zip = new JSZip();
			zip.file(fileId + '.txt', db[fileId]);
			res.status(200);
		} else {
			res.status(400).json({message: 'NOT FOUND'});
		}
	} catch (e) {
		res.status(500).send(e);
	}
});

app.post('/events', (req: request, res: response) => {
	const {type, data}: {type: string, data: { fileId: string, content?: string }} = req.body;
	if (type === 'FileOpened') {
		try {
			const { fileId } = data;
			if (fileId in db) {
				const content = decode(db[fileId]);
				res.status(200).json({content});
			} else {
				res.status(400).json({message: 'NOT FOUND'});
			}
		} catch (e) {
			res.status(500).send(e);
		}
	} else if (type === 'FileModified') {
		try {
			const { fileId, content } = data;
			if (fileId in db) {
				const newContent = encode(content);
				db[fileId] = newContent;
				res.status(201).json('successful compression');
			} else {
				res.status(400).json({message: 'NOT FOUND'});
			}
		} catch (e) {
			res.status(500).send(e);
		}
	}
});

app.listen(4008, () => {
	console.log('Listening on 4008');
});