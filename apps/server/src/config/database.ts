import { Db, MongoClient, ServerApiVersion } from "mongodb";
import environmentConfig from "src/config/environment";

let trellifyDatabaseInstance: Db | undefined;

const mongoClientInstance = new MongoClient(environmentConfig.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const CONNECT_DB = async (): Promise<Db | undefined> => {
  if (trellifyDatabaseInstance) {
    return trellifyDatabaseInstance;
  }
  await mongoClientInstance.connect();
  trellifyDatabaseInstance = mongoClientInstance.db(environmentConfig.DATABASE_NAME);
  return trellifyDatabaseInstance;
};

export const GET_DB = (): Db => {
  if (!trellifyDatabaseInstance) {
    throw new Error("Database not connected. Call CONNECT_DB first.");
  }
  return trellifyDatabaseInstance;
};

export const CLOSE_DB = async (): Promise<void> => {
  await mongoClientInstance.close();
  trellifyDatabaseInstance = undefined;
};
