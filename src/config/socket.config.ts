export const socketConfig = () => ({
  port: parseInt(process.env.SOCKET_PORT, 10) || 3003,
  cors: {
    origin: "*",
  },
});
