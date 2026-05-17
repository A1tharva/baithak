import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config'; // requires dotenv to be installed in server, wait it's in server

const token = jwt.sign({ id: '6a0782149b13dd52dc959c93' }, 'baithak_secret');

const buffer = fs.readFileSync('test.mp4');
const blob = new Blob([buffer], { type: 'video/mp4' });
const form = new FormData();
form.append('file', blob, 'test.mp4');

fetch('http://localhost:5001/api/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: form
}).then(async res => {
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', await res.text());
}).catch(err => console.log('ERROR:', err));
