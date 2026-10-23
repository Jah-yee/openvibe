import { call } from "./invoke";

export const ping = () => call<string>("ping");
