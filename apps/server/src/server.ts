import './realtime/index.js';
import { httpServer } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

httpServer.listen(PORT, () => {
  console.log(`Cadence server running on http://localhost:${PORT}`);
});
