const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: '6a0782149b13dd52dc959c93' }, 'my_super_secret_jwt_key_2026');

const form = new FormData();
form.append('file', fs.createReadStream('../test60.mp4'));

axios.post('http://[::1]:5001/api/upload', form, {
  headers: {
    ...form.getHeaders(),
    Authorization: `Bearer ${token}`
  }
}).then(res => console.log('SUCCESS:', res.data)).catch(err => console.log('ERROR:', err.response?.data || err.message));
