import { Counter, Rate, Trend } from "k6/metrics";

export const businessErrors = new Rate("trellify_business_errors");
export const readFlowDuration = new Trend("trellify_read_flow_duration", true);
export const writeFlowDuration = new Trend("trellify_write_flow_duration", true);
export const authFlowDuration = new Trend("trellify_auth_flow_duration", true);

export const broadcastsReceived = new Counter("trellify_broadcasts_received");
export const broadcastBytes = new Counter("trellify_broadcast_bytes");
export const socketJoinFailures = new Counter("trellify_socket_join_failures");
