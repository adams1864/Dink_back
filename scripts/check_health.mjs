import fetch from 'node-fetch';

try {
  const res = await fetch('http://localhost:4000/health');
  const body = await res.text();
  console.log('STATUS', res.status);
  console.log(body);
} catch (err) {
  console.error('ERROR', err.message || err);
}
