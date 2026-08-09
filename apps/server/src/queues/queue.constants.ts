import environmentConfig from "src/config/environment";

export const QUEUE_PREFIX = environmentConfig.QUEUE_PREFIX;

export const QUEUE_NAMES = {
  DELETE_UNVERIFIED_USER: "delete-unverified-user",
} as const;
