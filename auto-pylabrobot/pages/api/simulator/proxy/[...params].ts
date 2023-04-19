/**
 * Proxy requests to go to a PyLabRobot simulator server.
 */

module.exports = async (req: any, res: any) => {
  // The "params" property contains an array of path segments.
  // For example, for the URL "/api/hello/world", "params" will be ["hello", "world"]
  const { params } = req.query;

  const target = `http://localhost:${
    req.cookies.serverInternalSimulatorPort
  }/${params.join('/')}`;

  try {
    // Forward the original headers, excluding the "host" header
    const headers = { ...req.headers };
    delete headers.host;

    // Set up fetch options to include original method, headers, cookies, and body
    const fetchOptions = {
      method: req.method,
      headers: headers,
      body:
        req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    };

    // Make a request to the target endpoint
    const response = await fetch(target, fetchOptions);

    // Convert the response body to plain text
    const data = await response.text();

    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    // Return the response data as plain text with the same status code
    res.status(response.status).send(data);
  } catch (error: any) {
    // Handle any errors that occur during the request
    res.status(500).send(error.message);
  }
};

// Add the config to allow the API route to handle the proxy
module.exports.config = {
  api: {
    bodyParser: false, // prevent Next.js from interfering with request bodies
    externalResolver: true, // let Next.js know that we can be responsible for all responses returned
  },
};
