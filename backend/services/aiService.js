const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 30000
});

async function checkHealth() {
  try {
    const response = await client.get('/health');
    return response.data;
  } catch (err) {
    return { status: 'UNAVAILABLE', error: err.message };
  }
}

async function validateFace(imageFilePath, expectedPose = 'natural_front') {
  const form = new FormData();
  form.append('file', fs.createReadStream(imageFilePath));
  form.append('expected_pose', expectedPose);

  const response = await client.post('/validate-face', form, {
    headers: form.getHeaders()
  });
  return response.data;
}

async function registerFace(imageFilePath, expectedPose = 'natural_front') {
  const form = new FormData();
  form.append('file', fs.createReadStream(imageFilePath));
  form.append('expected_pose', expectedPose);

  const response = await client.post('/register-face', form, {
    headers: form.getHeaders()
  });
  return response.data;
}

async function recognizeGroup(imageFilePath, enrolledStudents, threshold = null) {
  const form = new FormData();
  form.append('file', fs.createReadStream(imageFilePath));
  form.append('enrolled_data_json', JSON.stringify(enrolledStudents));
  if (threshold !== null && threshold !== undefined) {
    form.append('threshold', String(threshold));
  }

  const response = await client.post('/recognize-group', form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  return response.data;
}

async function compareFaces(filePath1, filePath2) {
  const form = new FormData();
  form.append('file1', fs.createReadStream(filePath1));
  form.append('file2', fs.createReadStream(filePath2));

  const response = await client.post('/compare-faces', form, {
    headers: form.getHeaders()
  });
  return response.data;
}

async function evaluateModel(pairs, thresholds = null) {
  const response = await client.post('/evaluate-model', {
    pairs,
    thresholds
  });
  return response.data;
}

module.exports = {
  checkHealth,
  validateFace,
  registerFace,
  recognizeGroup,
  compareFaces,
  evaluateModel
};
