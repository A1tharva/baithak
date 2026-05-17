import fs from 'fs';
import jwt from 'jsonwebtoken';
import 'dotenv/config'; 

const token = jwt.sign({ id: '6a0782149b13dd52dc959c93' }, process.env.JWT_SECRET || 'baithak_secret');

const buffer = fs.readFileSync('../test1.mp4');
const blob = new Blob([buffer], { type: 'video/mp4' });
const form = new FormData();
form.append('file', blob, 'test1.mp4');

fetch('http://127.0.0.1:5001/api/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: form
}).then(async res => {
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', await res.text());
}).catch(err => console.log('ERROR:', err));
