
module.exports = async (req: any, res: any) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  try {
    const { scriptCode } = req.body;
    if (!scriptCode) {
      res.status(400).json({ message: 'scriptCode is required' });
      return;
    }

    const response = await fetch('http://localhost:5000/run-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script_code: scriptCode }),
    });

    // Forward the response from the Python web server back to the client
    res.status(response.status).json(await response.json());
  } catch (error: any) {
    // Handle any errors that occur during the request
    res.status(error.response?.status || 500).json(error.message);
  }
};
