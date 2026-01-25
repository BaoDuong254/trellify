import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { ALLOW_COMMON_FILE_TYPES, LIMIT_COMMON_FILE_SIZE } from "@workspace/shared/utils/validators";
import ApiError from "src/utils/api-error";
import { Request as ExpressRequest } from "express";

const customFileFilter = (
  _request: ExpressRequest,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
): void => {
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errorMessage = "File type is invalid. Only accept jpg, jpeg and png";
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage) as Error);
  }
  return callback(null, true);
};

const upload = multer({
  limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
  fileFilter: customFileFilter,
});

export const multerMiddleware = { upload };
