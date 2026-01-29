import { CorsOptions } from "cors";
import { StatusCodes } from "http-status-codes";
import environmentConfig from "src/config/environment";
import ApiError from "src/utils/api-error";
import { WHITELIST_DOMAINS } from "src/utils/constants";

export const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback) {
    if (environmentConfig.NODE_ENV === "development") {
      return callback(null, true);
    }

    if (!origin) {
      return callback(null, true);
    }

    if (WHITELIST_DOMAINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new ApiError(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`));
  },
  optionsSuccessStatus: 200,
  credentials: true,
};
