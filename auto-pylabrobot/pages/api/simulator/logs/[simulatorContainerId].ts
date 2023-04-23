import { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Extract the simulatorContainerId from the request path
  const { simulatorContainerId } = req.query;

  // Validate the simulatorContainerId
  if (!simulatorContainerId || Array.isArray(simulatorContainerId)) {
    return res.status(400).json({ error: 'Invalid simulatorContainerId' });
  }

  try {
    // Define the target URL for the proxy request
    const targetUrl = `http://localhost:5000/logs/${simulatorContainerId}`;

    // Make a GET request to the target URL using the global fetch function
    const response = await fetch(targetUrl);

    // Validate the response status
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();

    // Extract the logs from the JSON response
    const logs = data.logs;

    // Send the logs as a JSON response with the key 'logs'
    res.status(200).json({ logs });
  } catch (error: any) {
    // Handle errors, such as a failure to connect to the target URL
    res.status(500).json({ error: error.message });
  }
};
