import { CreateNewColumnType } from "@workspace/shared/schemas/column.schema";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { columnService } from "src/services/column.service";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const createdColumn = await columnService.createNew(request.body as CreateNewColumnType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Column created successfully",
      data: createdColumn,
    });
  } catch (error) {
    next(error);
  }
};

export const columnController = {
  createNew,
};
