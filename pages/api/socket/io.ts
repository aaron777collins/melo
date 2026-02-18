import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false
  }
};

// Stub implementation - Matrix uses sync API instead of socket.io
const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(501).json({ 
    error: "Socket.io not configured - using Matrix sync API instead" 
  });
};

export default ioHandler;
