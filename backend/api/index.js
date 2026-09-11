import app from '../src/app.js';

// Vercel's Node.js runtime treats the default export of a file under /api as a request
// handler — an Express app already has the (req, res) signature Vercel expects, so no
// adapter is needed. vercel.json rewrites every path to this one function, and Express's
// own router (routes/index.js) still does the real dispatching internally.
export default app;
