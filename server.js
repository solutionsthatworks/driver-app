const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use('/laundryatyourdoor/driver-app', express.static(path.join(__dirname, 'build')));

// React routing fallback
app.get('/laundryatyourdoor/driver-app/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/laundryatyourdoor/driver-app`);
});
