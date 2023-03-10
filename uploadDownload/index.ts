import express from 'express';
import logger from 'morgan';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(cors());

interface File {
    fileId: string;
    name: string;
    size: number;
    tags: string[];
    type: string;
    date: Date;
    content: string;
}

interface FileUpload {
    name: string;
    content: string;
}

type FileEvent = 'FileCreated' | 'FileUpdated' | 'FileDeleted' | 'ShootFileAnalytics' | 'GetFileAnalytics';

interface FileEventMessage {
    type: FileEvent;
    data: File | { files: File[] } | { fileId: string, content: string };
}

const downloadFile = async (fileId : string) => {
    const file = await axios.get(`http://fileservice:4009/files/${fileId}`) as { data : File };
    fs.writeFileSync(`./tempFiles/${fileId}.txt`, JSON.stringify(file.data));
    return file;
}

const uploadFile = async (file : FileUpload) => {
    const response = await axios.post('http://fileservice:4009/files', file) as { data : File };
    return response;
}

app.get('/files/:fileId/download', async (req : express.Request, res : express.Response) => {
    try{
        const { fileId } = req.params as { fileId : string };
        await downloadFile(fileId);
        res.download(`./tempFiles/${fileId}.txt`, `${fileId}.txt`, (err) => {
            if (err) {
                console.log(err);
            } else {
                fs.unlink(`./tempFiles/${fileId}.txt`, (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/files/upload', async (req : express.Request, res : express.Response) => {
    try{
        const { name, content } : FileUpload = req.body;
        const file : FileUpload = {
            name,
            content
        };
        const response = await uploadFile(file) as { data : File };
        
        //! NEW
        axios.post('http://event-bus:4012/events', {
            type: 'FileCreated',
            data: {
                fileId: response.data.fileId,
                content
            },
        } as FileEventMessage);
        
        res.status(200).send(response.data as File);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/events', (req : express.Request, res : express.Response) => {
    const { type, data } = req.body as FileEventMessage;
    /* if(type === 'FileCreated'){
        axios.post('http://event-bus:4012/events', {
            type: 'FileCreated',
            data,
        } as FileEventMessage);
    } */
    /* if(type === 'FileUpdated'){
        axios.post('http://event-bus:4012/events', {
            type: 'FileUpdated',
            data,
        } as FileEventMessage);
    } */
    res.status(200).send({});
});

app.listen(4011, () => {
    console.log('uploadDownload service listening on port 4011');
});