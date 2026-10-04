import { setupServer } from "msw/node";

export const API = "http://localhost:3000/api/v1";

// Each test registers the handlers it needs with server.use(...).
export const server = setupServer();
