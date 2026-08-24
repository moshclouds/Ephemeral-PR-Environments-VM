const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`Webhook receiver listening on port ${port}`);
});
